import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildBroadcastMessages, performBroadcastSend } from "@/lib/broadcast/send-broadcast";

// Not under src/app/[locale]/ — this is hit by an external scheduler
// (Vercel Cron, or any other cron/HTTP-trigger service; this template
// doesn't assume a specific host), never a browser, so it has no
// locale/UI concerns. The scheduler needs to be configured separately —
// see README/PROGRESS.md — to call this on some interval (e.g. every
// minute); nothing inside this app triggers it on its own.
//
// Vercel Cron Jobs automatically send `Authorization: Bearer $CRON_SECRET`
// when CRON_SECRET is set in the project's env — checking that header
// first matches that convention; the query param is a fallback for
// schedulers that can't set custom headers.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  return processDueBroadcasts(request);
}

export async function POST(request: Request) {
  return processDueBroadcasts(request);
}

async function processDueBroadcasts(request: Request) {
  if (!isAuthorized(request)) {
    return new NextResponse(null, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: due, error } = await supabase
    .from("broadcasts")
    .select("id, line_channel_id, content, image_media_path, audience")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { id: string; outcome: "sent" | "failed" | "already_claimed" }[] = [];

  for (const broadcast of due ?? []) {
    // Claim it first — if another invocation already flipped this row to
    // 'sending' (or it somehow already resolved) between the select above
    // and here, this update matches zero rows and we skip it rather than
    // sending the same broadcast twice.
    const { data: claimed } = await supabase
      .from("broadcasts")
      .update({ status: "sending" })
      .eq("id", broadcast.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();

    if (!claimed) {
      results.push({ id: broadcast.id, outcome: "already_claimed" });
      continue;
    }

    const messages = await buildBroadcastMessages(broadcast.content, broadcast.image_media_path);
    const sent = await performBroadcastSend({
      lineChannelUuid: broadcast.line_channel_id,
      audience: broadcast.audience,
      messages,
    });

    await supabase
      .from("broadcasts")
      .update({
        status: sent.ok ? "sent" : "failed",
        error_message: sent.ok ? null : sent.error,
      })
      .eq("id", broadcast.id);

    results.push({ id: broadcast.id, outcome: sent.ok ? "sent" : "failed" });
  }

  return NextResponse.json({ processed: results.length, results });
}
