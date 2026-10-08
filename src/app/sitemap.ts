import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";
import { routing } from "@/i18n/routing";

// Only the public, indexable pages — app/admin/onboarding are kept out via
// robots.ts and their own noindex metadata, so they have no place here.
const PUBLIC_PATHS = ["", "/login", "/signup", "/forgot-password"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
      },
    })),
  );
}
