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

// The subset of a "message" event's payload the Inbox feature actually
// consumes. Other message subtypes (video/audio/file/location/sticker)
// come through with this same shape but aren't persisted yet — narrowed to
// "text" | "image" by the webhook handler before use.
export type LineMessageEvent = LineWebhookEvent & {
  type: "message";
  source: { type: string; userId: string };
  message: { id: string; type: string; text?: string };
};

// Message objects sent TO LINE (reply/push). Text is the only variant
// typed explicitly — richer types (image, flex, template, etc.) can be
// added when a feature actually needs them; the index signature lets a
// caller pass one through untyped in the meantime rather than blocking on it.
export type LineTextMessage = { type: "text"; text: string };
export type LineMessage = LineTextMessage | { type: string; [key: string]: unknown };
