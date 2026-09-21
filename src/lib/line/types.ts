// Deliberately loose — this only needs to be enough to log/route what
// arrives. Full per-event-type modeling (message/follow/unfollow/postback/
// beacon/etc.) belongs with the Inbox feature that will actually consume
// these, not the webhook receiver itself.
// https://developers.line.biz/en/reference/messaging-api/#common-properties

export type LineWebhookEvent = {
  type: string;
  mode: "active" | "standby";
  timestamp: number;
  source?: { type: string; userId?: string; groupId?: string; roomId?: string };
  replyToken?: string;
  webhookEventId: string;
  [key: string]: unknown;
};

export type LineWebhookBody = {
  destination: string;
  events: LineWebhookEvent[];
};

// Message objects sent TO LINE (reply/push). Text is the only variant
// typed explicitly — richer types (image, flex, template, etc.) can be
// added when a feature actually needs them; the index signature lets a
// caller pass one through untyped in the meantime rather than blocking on it.
export type LineTextMessage = { type: "text"; text: string };
export type LineMessage = LineTextMessage | { type: string; [key: string]: unknown };
