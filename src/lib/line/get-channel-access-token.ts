import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Server-only: routes through get_line_channel_secrets, which is
// service_role-only at the database level (see
// docs/decisions/0003-line-credential-storage.md) — this function is the
// one place in the app that's allowed to call it.
export async function getLineChannelAccessToken(lineChannelId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("get_line_channel_secrets", { p_line_channel_id: lineChannelId });

  if (error || !data || data.length === 0) return null;

  return data[0].channel_access_token;
}

// Same lookup, but keyed by line_channels.id (the uuid conversations.line_channel_id
// points at) rather than LINE's own numeric Channel ID — the shape the
// Inbox's reply actions have on hand.
export async function getLineChannelAccessTokenByChannelUuid(lineChannelUuid: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: channel } = await supabase
    .from("line_channels")
    .select("line_channel_id")
    .eq("id", lineChannelUuid)
    .single();

  if (!channel) return null;

  return getLineChannelAccessToken(channel.line_channel_id);
}
