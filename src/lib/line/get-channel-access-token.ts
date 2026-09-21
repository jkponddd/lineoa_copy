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
