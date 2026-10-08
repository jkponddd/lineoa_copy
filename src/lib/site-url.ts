// Used for everything that needs a stable, absolute URL at build/render
// time (metadataBase, sitemap.xml, robots.txt, JSON-LD) — distinct from
// getSiteOrigin(), which reads the actual request's Host header for
// runtime things like building an email link. Metadata routes aren't
// always request-scoped, so they need an env-configured value instead.
// Production deployments of this template must set NEXT_PUBLIC_SITE_URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
