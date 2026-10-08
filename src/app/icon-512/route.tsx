import { ImageResponse } from "next/og";

// See icon-192/route.tsx — same mark, the other size PWA installs expect.
export function GET() {
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
        }}
      >
        <div style={{ width: 224, height: 224, borderRadius: 999, backgroundColor: "#fafafa" }} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
