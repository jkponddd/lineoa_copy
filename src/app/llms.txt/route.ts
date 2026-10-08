import { SITE_URL } from "@/lib/site-url";

// llms.txt (llmstxt.org) — a short index for AI/LLM crawlers, in the
// documented spec's shape: H1, a one-line blockquote summary, then
// markdown link lists grouped under H2 sections. The full page content
// (features/pricing/FAQ, for GEO — crawlers that quote/cite content
// directly rather than just linking to it) lives in the companion
// llms-full.txt this links to, not duplicated here.
export function GET() {
  const body = `# LINE OA Platform

> A multi-tenant SaaS platform for managing LINE Official Accounts — real-time inbox, broadcast messaging (text, image, video, Flex Message, Imagemap), a drag-to-draw rich menu builder, and reporting, with role-based access across multiple organizations.

Available in Thai (default) and English at /th/* and /en/* respectively. Everything under /app/* and /admin/* requires authentication and is not meant to be indexed or cited.

## Docs

- [Full page content](${SITE_URL}/llms-full.txt): features, pricing, and FAQ in plain markdown
- [Homepage](${SITE_URL}/th): product overview, in Thai
- [Homepage (English)](${SITE_URL}/en): product overview, in English

## Product

- [Sign up](${SITE_URL}/th/signup)
- [Log in](${SITE_URL}/th/login)
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
