import { ImageResponse } from "next/og";

// Next.js auto-detects this file and wires up the browser tab's <link
// rel="icon"> — no real logo asset exists yet, so this is a simple,
// brand-consistent mark (dark square, white dot) generated the same way
// as the homepage's opengraph-image.tsx, rather than a placeholder image
// file checked into the repo.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          borderRadius: 7,
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: "#fafafa" }} />
      </div>
    ),
    { ...size },
  );
}
