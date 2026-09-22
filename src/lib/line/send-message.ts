import type { LineMessage } from "./types";

// https://developers.line.biz/en/reference/messaging-api/#send-reply-message
// https://developers.line.biz/en/reference/messaging-api/#send-push-message
// https://developers.line.biz/en/reference/messaging-api/#send-broadcast-message
// Up to 5 message objects per request (LINE's documented limit) — not
// enforced here; callers are expected to respect it, same as LINE's own
// SDKs do.

export type LineApiResult = { ok: true } | { ok: false; status: number; error: string };

async function callLineMessagingApi(
  endpoint: "reply" | "push" | "broadcast" | "multicast",
  channelAccessToken: string,
  body: Record<string, unknown>,
): Promise<LineApiResult> {
  const res = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return { ok: true };

  const errorBody = await res.text();
  return { ok: false, status: res.status, error: errorBody };
}

export function replyMessage(
  channelAccessToken: string,
  replyToken: string,
  messages: LineMessage[],
): Promise<LineApiResult> {
  return callLineMessagingApi("reply", channelAccessToken, { replyToken, messages });
}

export function pushMessage(channelAccessToken: string, to: string, messages: LineMessage[]): Promise<LineApiResult> {
  return callLineMessagingApi("push", channelAccessToken, { to, messages });
}

// No `to` field — this is the one endpoint LINE itself fans out to every
// follower of the channel, which is exactly what "broadcast" means here
// (not our own recipient list; see the Broadcast feature's migration).
export function broadcastMessage(channelAccessToken: string, messages: LineMessage[]): Promise<LineApiResult> {
  return callLineMessagingApi("broadcast", channelAccessToken, { messages });
}

// https://developers.line.biz/en/reference/messaging-api/#send-multicast-message
// Our own recipient list (up to 500 userIds per call — LINE's documented
// limit; batching across that limit is the caller's job, see
// send-broadcast.ts), unlike broadcastMessage's "everyone" semantics.
export function multicastMessage(
  channelAccessToken: string,
  to: string[],
  messages: LineMessage[],
): Promise<LineApiResult> {
  return callLineMessagingApi("multicast", channelAccessToken, { to, messages });
}
