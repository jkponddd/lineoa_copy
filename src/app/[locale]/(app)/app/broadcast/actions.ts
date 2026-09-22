"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { buildBroadcastMessages, performBroadcastSend } from "@/lib/broadcast/send-broadcast";
import type { BroadcastAudience } from "@/lib/supabase/database.types";

export type BroadcastActionResult = { error: string | null };

export async function sendBroadcast(params: {
  lineChannelId: string;
  content: string;
  imageMediaPath: string | null;
  audience: BroadcastAudience;
  scheduledAt: string | null;
}): Promise<BroadcastActionResult> {
  const trimmedContent = params.content.trim();
  if (!trimmedContent && !params.imageMediaPath) return { error: "empty" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const content = trimmedContent || null;

  // Scheduled for later: just record it as queued — nothing gets sent to
  // LINE until the cron-triggered route (src/app/api/broadcasts/process-due)
  // picks it up at or after scheduledAt. No point resolving a signed image
  // URL now either; it would likely expire before send time.
  if (params.scheduledAt) {
    const { error } = await supabase.rpc("record_broadcast", {
      p_line_channel_id: params.lineChannelId,
      p_content: content,
      p_image_media_path: params.imageMediaPath,
      p_audience: params.audience,
      p_scheduled_at: params.scheduledAt,
      p_status: "scheduled",
      p_error_message: null,
      p_sent_by: user.id,
    });

    if (error) return { error: error.message };

    revalidatePath("/[locale]/(app)/app/broadcast", "page");
    return { error: null };
  }

  // Send now.
  const messages = await buildBroadcastMessages(content, params.imageMediaPath);
  const sent = await performBroadcastSend({
    lineChannelUuid: params.lineChannelId,
    audience: params.audience,
    messages,
  });

  // Recorded either way — a failed send is still part of the history, per
  // record_broadcast()'s own reasoning (see the migration).
  const { error } = await supabase.rpc("record_broadcast", {
    p_line_channel_id: params.lineChannelId,
    p_content: content,
    p_image_media_path: params.imageMediaPath,
    p_audience: params.audience,
    p_scheduled_at: null,
    p_status: sent.ok ? "sent" : "failed",
    p_error_message: sent.ok ? null : sent.error,
    p_sent_by: user.id,
  });

  if (error) return { error: error.message };
  if (!sent.ok) return { error: "line_api_failed" };

  revalidatePath("/[locale]/(app)/app/broadcast", "page");
  return { error: null };
}

export async function cancelScheduledBroadcast(broadcastId: string): Promise<BroadcastActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_scheduled_broadcast", { p_broadcast_id: broadcastId });

  if (error) return { error: error.message };

  revalidatePath("/[locale]/(app)/app/broadcast", "page");
  return { error: null };
}
