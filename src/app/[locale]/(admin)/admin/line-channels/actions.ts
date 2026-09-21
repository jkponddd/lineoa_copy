"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { getLineBotInfo } from "@/lib/line/get-bot-info";
import type { AuthFormState } from "../../../(auth)/actions";

export async function connectLineChannel(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") {
    return { error: "Not authorized.", info: null };
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const lineChannelId = String(formData.get("channelId") ?? "").trim();
  const channelSecret = String(formData.get("channelSecret") ?? "").trim();
  const channelAccessToken = String(formData.get("channelAccessToken") ?? "").trim();

  if (!displayName || !lineChannelId || !channelSecret || !channelAccessToken) {
    return { error: "nameRequired", info: null };
  }

  const botInfo = await getLineBotInfo(channelAccessToken);
  if ("error" in botInfo) {
    return { error: "invalidToken", info: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_line_channel", {
    p_organization_id: membership.organization.id,
    p_line_channel_id: lineChannelId,
    p_bot_user_id: botInfo.userId,
    p_display_name: displayName,
    p_channel_secret: channelSecret,
    p_channel_access_token: channelAccessToken,
  });

  if (error) {
    const message = error.message.includes("duplicate key") ? "duplicateChannel" : error.message;
    return { error: message, info: null };
  }

  revalidatePath("/[locale]/(admin)/admin/line-channels", "page");
  return { error: null, info: "connected" };
}

export async function disconnectLineChannel(lineChannelId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("delete_line_channel", { p_line_channel_id: lineChannelId });
  revalidatePath("/[locale]/(admin)/admin/line-channels", "page");
}
