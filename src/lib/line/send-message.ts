import type { LineMessage } from "./types";

// https://developers.line.biz/en/reference/messaging-api/#send-reply-message
// https://developers.line.biz/en/reference/messaging-api/#send-push-message
// Up to 5 message objects per request (LINE's documented limit) — not
// enforced here; callers are expected to respect it, same as LINE's own
// SDKs do.

export type LineApiResult = { ok: true } | { ok: false; status: number; error: string };

async function callLineMessagingApi(
  endpoint: "reply" | "push",
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
