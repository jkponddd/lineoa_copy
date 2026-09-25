import { NextResponse } from "next/server";
import sharp from "sharp";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

// sharp needs Node's native bindings — not available on the Edge runtime.
export const runtime = "nodejs";

// LINE's Imagemap Message fetches `{baseUrl}/{width}` directly from its own
// servers — potentially long after the broadcast was sent, and repeatedly
// for different requested widths — so this can't be a signed Storage URL
// (those expire) and genuinely needs to be a public, unauthenticated route,
// same category of exception as the LINE webhook route itself.
//
// The last path segment is the width LINE requested (e.g. "1040"); the
// rest is the Storage object path. Resized on the fly with sharp rather
// than serving the original at every width, so LINE's own bandwidth
// intent for smaller requested sizes is actually honored. Not cached
// server-side (recomputed per request) — fine at this project's scale;
// the response itself is still cacheable by LINE's/any CDN in front via
// Cache-Control.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (segments.length < 2) return new NextResponse(null, { status: 404 });

  const requestedWidth = Number(segments[segments.length - 1]);
  const storagePath = segments.slice(0, -1).join("/");

  const service = createServiceRoleClient();
  const { data, error } = await service.storage.from("line-media").download(storagePath);
  if (error || !data) return new NextResponse(null, { status: 404 });

  const inputBuffer = Buffer.from(await data.arrayBuffer());
  let outputBuffer: Buffer = inputBuffer;
  let contentType = data.type || "application/octet-stream";

  if (Number.isFinite(requestedWidth) && requestedWidth > 0) {
    try {
      const resized = await sharp(inputBuffer)
        .resize({ width: Math.round(requestedWidth), withoutEnlargement: true })
        .toBuffer({ resolveWithObject: true });
      outputBuffer = resized.data;
      contentType = `image/${resized.info.format}`;
    } catch {
      // Not a format sharp can process, or some other resize failure —
      // fall back to serving the original bytes rather than a broken
      // response; still a valid image, just not resized.
    }
  }

  return new NextResponse(new Uint8Array(outputBuffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
