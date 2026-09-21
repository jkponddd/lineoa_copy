import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyLineSignature } from "@/lib/line/verify-signature";
import type { LineWebhookBody } from "@/lib/line/types";

// Not under src/app/[locale]/ — this is called by LINE's servers directly,
// never by a browser, so it has no locale/UI concerns.
export async function POST(request: Request) {
  // Must read the raw text before any JSON parsing — signature
  // verification needs the exact bytes LINE signed, not a re-serialized
  // round-trip through JSON.parse/JSON.stringify.
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-line-signature");

  let destination: string | undefined;
  try {
    destination = (JSON.parse(rawBody) as Partial<LineWebhookBody>).destination;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (!destination) {
    return new NextResponse(null, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: matches, error } = await supabase.rpc("get_line_channel_secrets_by_bot_user_id", {
    p_bot_user_id: destination,
  });

  if (error || !matches || matches.length === 0) {
    // Unrecognized channel — nothing to verify or act on, and nothing will
    // change on retry, so acknowledge rather than making LINE keep retrying.
    return new NextResponse(null, { status: 200 });
  }

  const { channel_secret: channelSecret } = matches[0];

  if (!verifyLineSignature(rawBody, signatureHeader, channelSecret)) {
    return new NextResponse(null, { status: 401 });
  }

  const body = JSON.parse(rawBody) as LineWebhookBody;

  // Event processing (persisting messages, auto-reply, routing into an
  // inbox) is a separate future step — this confirms the request is
  // genuinely signed by LINE for a channel we manage and acknowledges it.
  console.log(`[line webhook] verified request for destination=${destination}, ${body.events.length} event(s)`);

  return new NextResponse(null, { status: 200 });
}
