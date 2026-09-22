import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyLineSignature } from "@/lib/line/verify-signature";
import { getLineUserProfile } from "@/lib/line/get-profile";
import { getLineMessageContent } from "@/lib/line/get-message-content";
import type { LineMessageEvent, LineWebhookBody } from "@/lib/line/types";

const IMAGE_EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const INBOUND_MESSAGE_TYPES = ["text", "image", "sticker", "file"] as const;
type InboundMessageType = (typeof INBOUND_MESSAGE_TYPES)[number];

function isInboundMessageType(type: string): type is InboundMessageType {
  return (INBOUND_MESSAGE_TYPES as readonly string[]).includes(type);
}

// Not under src/app/[locale]/ — this is called by LINE's servers directly,
// never by a browser, so it has no locale/UI concerns.
export async function POST(request: Request) {
  // Must read the raw text before any JSON parsing — signature
  // verification needs the exact bytes LINE signed, not a re-serialized
  // round-trip through JSON.parse/JSON.stringify.
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-line-signature");

  let destination: string | undefined;
  try {
    destination = (JSON.parse(rawBody) as Partial<LineWebhookBody>).destination;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!destination) {
    return new NextResponse(null, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: matches, error } = await supabase.rpc("get_line_channel_secrets_by_bot_user_id", {
    p_bot_user_id: destination,
  });

  if (error || !matches || matches.length === 0) {
    // Unrecognized channel — nothing to verify or act on, and nothing will
    // change on retry, so acknowledge rather than making LINE keep retrying.
    return new NextResponse(null, { status: 200 });
  }

  const { channel_secret: channelSecret, channel_access_token: channelAccessToken } = matches[0];

  if (!verifyLineSignature(rawBody, signatureHeader, channelSecret)) {
    return new NextResponse(null, { status: 401 });
  }

  const body = JSON.parse(rawBody) as LineWebhookBody;

  // Respond to LINE immediately; process events after. LINE expects a fast
  // 200 and retries on timeout — this ack shouldn't wait on our own DB/API
  // round trips. (Next.js keeps the function alive for awaited work started
  // before the response as long as we don't return early inside a
  // serverless boundary; on this platform the handler runs to completion,
  // so it's safe to just await below rather than fire-and-forget.)
  for (const event of body.events) {
    if (event.type !== "message") continue;
    await handleMessageEvent(supabase, destination, channelAccessToken, event as LineMessageEvent);
  }

  return new NextResponse(null, { status: 200 });
}

async function handleMessageEvent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  botUserId: string,
  channelAccessToken: string,
  event: LineMessageEvent,
) {
  const messageType = event.message.type;
  if (!isInboundMessageType(messageType)) return;

  const profile = await getLineUserProfile(channelAccessToken, event.source.userId);

  const { data: conversation, error: conversationError } = await supabase.rpc("upsert_conversation_for_webhook", {
    p_bot_user_id: botUserId,
    p_line_user_id: event.source.userId,
    p_display_name: profile?.displayName ?? null,
    p_picture_url: profile?.pictureUrl ?? null,
  });

  if (conversationError || !conversation) {
    console.error("[line webhook] failed to upsert conversation", conversationError);
    return;
  }

  let content: string | null = null;
  let mediaPath: string | null = null;

  if (messageType === "text") {
    content = event.message.text ?? "";
  } else if (messageType === "sticker") {
    // No bytes to fetch — LINE serves stickers from a public CDN URL built
    // from these two ids, resolved client-side (see MessageThread).
    content = JSON.stringify({ packageId: event.message.packageId, stickerId: event.message.stickerId });
  } else {
    // image or file: both go through the same download-then-store shape.
    const media = await getLineMessageContent(channelAccessToken, event.message.id);
    if (!media) {
      console.error(`[line webhook] failed to download ${messageType} content`, event.message.id);
      return;
    }

    const extension =
      messageType === "file"
        ? (event.message.fileName?.split(".").pop() ?? "bin")
        : (IMAGE_EXTENSION_BY_CONTENT_TYPE[media.contentType] ?? "jpg");
    mediaPath = `${conversation.organization_id}/${conversation.id}/${event.message.id}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("line-media")
      .upload(mediaPath, media.bytes, { contentType: media.contentType });

    if (uploadError) {
      console.error(`[line webhook] failed to upload ${messageType}`, uploadError);
      return;
    }

    if (messageType === "file") {
      content = event.message.fileName ?? null;
    }
  }

  const { error: messageError } = await supabase.rpc("insert_inbound_message", {
    p_conversation_id: conversation.id,
    p_type: messageType,
    p_content: content,
    p_media_path: mediaPath,
    p_line_message_id: event.message.id,
  });

  if (messageError) {
    console.error("[line webhook] failed to insert message", messageError);
  }
}
