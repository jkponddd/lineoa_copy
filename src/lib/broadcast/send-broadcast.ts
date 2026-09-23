import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getLineChannelAccessTokenByChannelUuid } from "@/lib/line/get-channel-access-token";
import { broadcastMessage, multicastMessage } from "@/lib/line/send-message";
import { blocksToLineMessages, type BroadcastBlock } from "@/lib/broadcast/blocks";
import type { LineMessage } from "@/lib/line/types";
import type { BroadcastAudience } from "@/lib/supabase/database.types";

// LINE's own documented multicast limit — batching across it is our job,
// LINE just rejects a request over 500 recipients outright.
const MULTICAST_BATCH_SIZE = 500;

export type BroadcastSendResult = { ok: true } | { ok: false; error: string };

// Shared between the "send now" server action and the scheduled-send cron
// route — both need the exact same delivery logic (resolve the channel
// token, pick broadcast vs. multicast based on audience, batch
// recipients), just triggered at different times by different callers.
export async function performBroadcastSend(params: {
  lineChannelUuid: string;
  audience: BroadcastAudience;
  messages: LineMessage[];
}): Promise<BroadcastSendResult> {
  const accessToken = await getLineChannelAccessTokenByChannelUuid(params.lineChannelUuid);
  if (!accessToken) return { ok: false, error: "channel_unavailable" };

  if (params.audience === "all") {
    const result = await broadcastMessage(accessToken, params.messages);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  // audience === "conversations": our own recipient list, built from
  // whoever has an existing conversation on this channel — not everyone
  // LINE knows about, unlike "all".
  const service = createServiceRoleClient();
  const { data: rows, error } = await service
    .from("conversations")
    .select("line_user_id")
    .eq("line_channel_id", params.lineChannelUuid);

  if (error) return { ok: false, error: error.message };

  const recipients = [...new Set((rows ?? []).map((r) => r.line_user_id))];
  if (recipients.length === 0) return { ok: false, error: "no_recipients" };

  for (let i = 0; i < recipients.length; i += MULTICAST_BATCH_SIZE) {
    const batch = recipients.slice(i, i + MULTICAST_BATCH_SIZE);
    const result = await multicastMessage(accessToken, batch, params.messages);
    if (!result.ok) return { ok: false, error: result.error };
  }

  return { ok: true };
}

// A broadcast's `blocks` become the actual LINE message objects here — the
// one place this conversion happens server-side, so the "send now" action,
// the test-send action, and the scheduled-send route can't drift apart on
// what a stored broadcast actually sends. The composer's live preview runs
// the same blocksToLineMessages algorithm client-side with local preview
// URLs instead of signed ones.
export async function buildBroadcastMessages(blocks: BroadcastBlock[]): Promise<LineMessage[]> {
  const mediaPaths = new Set<string>();
  for (const block of blocks) {
    if (block.type === "image") mediaPaths.add(block.mediaPath);
    if (block.type === "video") {
      mediaPaths.add(block.mediaPath);
      mediaPaths.add(block.previewMediaPath);
    }
  }

  const signedUrlByPath = new Map<string, string>();
  if (mediaPaths.size > 0) {
    const service = createServiceRoleClient();
    // Only needs to survive one immediate fetch by LINE's server, same
    // reasoning as the Inbox image reply's signed URL.
    await Promise.all(
      [...mediaPaths].map(async (path) => {
        const { data } = await service.storage.from("line-media").createSignedUrl(path, 3600);
        if (data) signedUrlByPath.set(path, data.signedUrl);
      }),
    );
  }

  return blocksToLineMessages(blocks, (path) => signedUrlByPath.get(path) ?? null);
}
