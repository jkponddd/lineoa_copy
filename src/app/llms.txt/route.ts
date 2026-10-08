import { SITE_URL } from "@/lib/site-url";

// llms.txt (llmstxt.org) — an emerging, robots.txt-like convention that
// gives AI agents/LLM crawlers a short, structured summary of a site,
// since they generally can't execute the JS-rendered page the way a
// browser does. Not a Next.js built-in metadata route type (unlike
// robots.ts/sitemap.ts), so this is a plain Route Handler instead.
export function GET() {
  const body = `# LINE OA Platform

> A multi-tenant SaaS platform for managing LINE Official Accounts — inbox, broadcast messaging, rich menus, and reporting, with role-based access across multiple organizations.

## Product

- Homepage: ${SITE_URL}/th
- Sign up: ${SITE_URL}/th/signup
- Log in: ${SITE_URL}/th/login

## Notes for crawlers

- Available in Thai (default) and English, at /th/* and /en/* respectively.
- Everything under /app/* and /admin/* requires authentication and is not meant to be indexed.
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
