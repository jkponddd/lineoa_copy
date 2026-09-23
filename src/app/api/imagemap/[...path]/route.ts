import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

// LINE's Imagemap Message fetches `{baseUrl}/{width}` directly from its own
// servers — potentially long after the broadcast was sent, and repeatedly
// for different requested widths — so this can't be a signed Storage URL
// (those expire) and genuinely needs to be a public, unauthenticated route,
// same category of exception as the LINE webhook route itself.
//
// The real Imagemap contract expects a differently-sized image per width
// suffix (e.g. /240, /700, /1040) for bandwidth efficiency. This template
// doesn't generate real per-width resizes (no image-processing dependency
// in the project) — it serves the original at every requested width, which
// satisfies LINE's URL-shape requirement and renders correctly, just
// without LINE's intended bandwidth optimization. Noted in PROGRESS.md.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  // Last segment is the width LINE requested (e.g. "1040") — ignored, see
  // above; everything before it is the actual Storage object path.
  if (segments.length < 2) return new NextResponse(null, { status: 404 });
  const storagePath = segments.slice(0, -1).join("/");

  const service = createServiceRoleClient();
  const { data, error } = await service.storage.from("line-media").download(storagePath);
  if (error || !data) return new NextResponse(null, { status: 404 });

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
