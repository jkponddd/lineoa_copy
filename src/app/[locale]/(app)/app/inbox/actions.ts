"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getLineChannelAccessTokenByChannelUuid } from "@/lib/line/get-channel-access-token";
import { pushMessage } from "@/lib/line/send-message";

export type InboxActionResult = { error: string | null };

type LoadedConversation =
  | { ok: true; conversation: { id: string; line_channel_id: string; line_user_id: string }; accessToken: string; userId: string }
  | { ok: false; error: string };

async function loadConversationForReply(conversationId: string): Promise<LoadedConversation> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, line_channel_id, line_user_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) return { ok: false, error: "conversation_not_found" };

  const accessToken = await getLineChannelAccessTokenByChannelUuid(conversation.line_channel_id);
  if (!accessToken) return { ok: false, error: "channel_unavailable" };

  return { ok: true, conversation, accessToken, userId: user.id };
}

export async function sendTextReply(conversationId: string, text: string): Promise<InboxActionResult> {
  const trimmed = text.trim();
  if (!trimmed) return { error: "empty" };

  const loaded = await loadConversationForReply(conversationId);
  if (!loaded.ok) return { error: loaded.error };
  const { conversation, accessToken, userId } = loaded;

  const sent = await pushMessage(accessToken, conversation.line_user_id, [{ type: "text", text: trimmed }]);
  if (!sent.ok) return { error: "line_api_failed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_outbound_message", {
    p_conversation_id: conversationId,
    p_type: "text",
    p_content: trimmed,
    p_media_path: null,
    p_sent_by: userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/inbox");
  return { error: null };
}

export async function sendImageReply(conversationId: string, mediaPath: string): Promise<InboxActionResult> {
  const loaded = await loadConversationForReply(conversationId);
  if (!loaded.ok) return { error: loaded.error };
  const { conversation, accessToken, userId } = loaded;

  const service = createServiceRoleClient();
  // LINE fetches the image from this URL server-side, so it needs a URL
  // reachable without our own auth — a signed Storage URL, not a direct
  // path, since the bucket is private.
  const { data: signed, error: signError } = await service.storage
    .from("line-media")
    .createSignedUrl(mediaPath, 3600);

  if (signError || !signed) return { error: "storage_failed" };

  const sent = await pushMessage(accessToken, conversation.line_user_id, [
    { type: "image", originalContentUrl: signed.signedUrl, previewImageUrl: signed.signedUrl },
  ]);
  if (!sent.ok) return { error: "line_api_failed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_outbound_message", {
    p_conversation_id: conversationId,
    p_type: "image",
    p_content: null,
    p_media_path: mediaPath,
    p_sent_by: userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/inbox");
  return { error: null };
}

// LINE's Messaging API's supported outbound message objects are text,
// sticker, image, video, audio, location, imagemap, template, and flex —
// there is no "file" type. A bot can never push a file attachment the way
// it can push an image; sending an arbitrary file back to a LINE user is
// only possible as a link, so this goes out as a plain text message
// containing the filename and a download URL, not a native LINE object.
export async function sendFileReply(conversationId: string, mediaPath: string, fileName: string): Promise<InboxActionResult> {
  const loaded = await loadConversationForReply(conversationId);
  if (!loaded.ok) return { error: loaded.error };
  const { conversation, accessToken, userId } = loaded;

  const service = createServiceRoleClient();
  // Unlike the image reply's signed URL (only needs to live long enough for
  // LINE's server to fetch it once, right away), this URL is the actual
  // thing the customer clicks — possibly days later — so it needs a much
  // longer expiry: 7 days, not the image path's 1 hour.
  const { data: signed, error: signError } = await service.storage
    .from("line-media")
    .createSignedUrl(mediaPath, 60 * 60 * 24 * 7);

  if (signError || !signed) return { error: "storage_failed" };

  const sent = await pushMessage(accessToken, conversation.line_user_id, [
    { type: "text", text: `📎 ${fileName}\n${signed.signedUrl}` },
  ]);
  if (!sent.ok) return { error: "line_api_failed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_outbound_message", {
    p_conversation_id: conversationId,
    p_type: "file",
    p_content: fileName,
    p_media_path: mediaPath,
    p_sent_by: userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/inbox");
  return { error: null };
}

export async function assignConversationAction(
  conversationId: string,
  assignedTo: string | null,
): Promise<InboxActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_conversation", {
    p_conversation_id: conversationId,
    p_assigned_to: assignedTo,
  });

  if (error) return { error: error.message };

  revalidatePath("/app/inbox");
  return { error: null };
}

export async function updateConversationStatusAction(
  conversationId: string,
  status: "open" | "closed",
): Promise<InboxActionResult> {
  const supabase = await createClient();
  // A plain RLS-checked update is enough here (unlike assign_conversation,
  // there's no cross-row check to make) — the existing "Members can update
  // their organization's conversations" policy already covers this.
  const { error } = await supabase.from("conversations").update({ status }).eq("id", conversationId);

  if (error) return { error: error.message };

  revalidatePath("/app/inbox");
  return { error: null };
}
