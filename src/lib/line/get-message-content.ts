// https://developers.line.biz/en/reference/messaging-api/#get-content
// Note the different host (api-data, not api) — LINE serves binary message
// content (images/video/audio) from a separate endpoint than the rest of
// the Messaging API.
export async function getLineMessageContent(
  channelAccessToken: string,
  messageId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });

  if (!res.ok) return null;

  return {
    bytes: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
