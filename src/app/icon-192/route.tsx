import { ImageResponse } from "next/og";

// A fixed, predictable path for manifest.ts's `icons` array — Next's
// auto-detected icon.tsx convention works for the browser tab/home-screen
// icon, but doesn't give a stable URL to hand-reference from the web app
// manifest, so this is a plain Route Handler instead, at the size PWA
// install prompts commonly expect.
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
        <div style={{ width: 84, height: 84, borderRadius: 999, backgroundColor: "#fafafa" }} />
      </div>
    ),
    { width: 192, height: 192 },
  );
}
