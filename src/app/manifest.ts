import type { MetadataRoute } from "next";

// Not locale-scoped — a web app manifest is one file for the whole site,
// conventionally in the default language. `start_url` points at the
// default locale's homepage rather than a bare "/", since this app always
// serves a locale-prefixed URL anyway.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LINE OA Platform",
    short_name: "LINE OA",
    description: "จัดการกล่องข้อความ บรอดแคสต์ ริชเมนู และรายงานของ LINE Official Account",
    start_url: "/th",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
