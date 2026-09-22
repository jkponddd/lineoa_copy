"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getLineChannelAccessTokenByChannelUuid } from "@/lib/line/get-channel-access-token";
import { broadcastMessage } from "@/lib/line/send-message";

export type BroadcastActionResult = { error: string | null };

export async function sendBroadcast(lineChannelId: string, content: string): Promise<BroadcastActionResult> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "empty" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const accessToken = await getLineChannelAccessTokenByChannelUuid(lineChannelId);
  if (!accessToken) return { error: "channel_unavailable" };

  const sent = await broadcastMessage(accessToken, [{ type: "text", text: trimmed }]);

  // Recorded either way — a failed send is still part of the history, per
  // record_broadcast()'s own reasoning (see the migration).
  const { error } = await supabase.rpc("record_broadcast", {
    p_line_channel_id: lineChannelId,
    p_content: trimmed,
    p_status: sent.ok ? "sent" : "failed",
    p_error_message: sent.ok ? null : sent.error,
    p_sent_by: user.id,
  });

  if (error) return { error: error.message };
  if (!sent.ok) return { error: "line_api_failed" };

  revalidatePath("/[locale]/(app)/app/broadcast", "page");
  return { error: null };
}
