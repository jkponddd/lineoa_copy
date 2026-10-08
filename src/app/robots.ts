import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";

// Not under src/app/[locale]/ — crawlers fetch this at the bare /robots.txt
// path, no locale prefix. Disallow rules use a `/*/` wildcard so they match
// every locale prefix (e.g. /th/app/, /en/app/) rather than listing each
// locale by hand.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/*/app/",
        "/*/admin/",
        "/*/onboarding",
        "/*/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
