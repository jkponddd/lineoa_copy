import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 16, height: 16, borderRadius: 999, backgroundColor: "#fafafa" }} />
          <span style={{ fontSize: 28, fontWeight: 600 }}>LINE OA Platform</span>
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.2, maxWidth: 980 }}>{t("title")}</div>
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa", marginTop: 24, maxWidth: 900 }}>{t("description")}</div>
      </div>
    ),
    { ...size },
  );
}
