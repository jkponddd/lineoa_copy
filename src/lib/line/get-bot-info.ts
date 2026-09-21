// https://developers.line.biz/en/reference/messaging-api/#get-bot-info
// Used at channel-connect time for two things at once: fetching the bot's
// userId (needed to route incoming webhooks — see the "destination" field
// in verify-signature.ts's neighbor, the webhook route) and validating that
// the channel access token the owner pasted in actually works, before we
// ever store it.
export async function getLineBotInfo(channelAccessToken: string): Promise<{ userId: string } | { error: string }> {
  const res = await fetch("https://api.line.me/v2/bot/info", {
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });

  if (!res.ok) {
    return { error: `LINE API returned ${res.status}` };
  }

  const data = (await res.json()) as { userId?: string };
  if (!data.userId) {
    return { error: "LINE API response was missing userId" };
  }

  return { userId: data.userId };
}
