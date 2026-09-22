// https://developers.line.biz/en/reference/messaging-api/#get-profile
// Used by the webhook handler to label a new conversation with the LINE
// user's display name/picture. Best-effort: a failure here shouldn't block
// storing the message itself, so callers treat a null return as "unknown
// sender" rather than an error.
export async function getLineUserProfile(
  channelAccessToken: string,
  userId: string,
): Promise<{ displayName: string; pictureUrl: string | null } | null> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { displayName?: string; pictureUrl?: string };
  if (!data.displayName) return null;

  return { displayName: data.displayName, pictureUrl: data.pictureUrl ?? null };
}
