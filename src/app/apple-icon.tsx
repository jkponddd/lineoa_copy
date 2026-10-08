import { ImageResponse } from "next/og";

// Same mark as icon.tsx, at the size iOS expects for an add-to-home-screen
// icon — Next.js auto-wires this to <link rel="apple-touch-icon">.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <div style={{ width: 80, height: 80, borderRadius: 999, backgroundColor: "#fafafa" }} />
      </div>
    ),
    { ...size },
  );
}
