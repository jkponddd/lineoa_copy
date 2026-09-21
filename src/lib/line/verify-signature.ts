import { createHmac, timingSafeEqual } from "node:crypto";

// LINE signs each webhook request: HMAC-SHA256 of the exact raw request
// body, using the channel secret as the key, base64-encoded, sent in the
// `x-line-signature` header. Must run against the raw body string/bytes —
// never a re-serialized JSON.parse(body) round-trip, which isn't guaranteed
// to produce byte-identical output.
// https://developers.line.biz/en/reference/messaging-api/#signature-validation
export function verifyLineSignature(rawBody: string, signatureHeader: string | null, channelSecret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", channelSecret).update(rawBody).digest();
  const expectedBase64 = expected.toString("base64");

  // Lengths must match before timingSafeEqual (it throws on mismatched
  // buffer lengths rather than returning false).
  if (expectedBase64.length !== signatureHeader.length) return false;

  return timingSafeEqual(Buffer.from(expectedBase64), Buffer.from(signatureHeader));
}
