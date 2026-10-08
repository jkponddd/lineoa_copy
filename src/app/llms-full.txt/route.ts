import { getTranslations } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

const FEATURE_COUNT = 6;
const FAQ_COUNT = 5;
const TIER_KEYS = ["free", "pro", "enterprise"] as const;

// The companion to llms.txt — the full homepage content (features,
// pricing, FAQ) as plain markdown, built from the exact same `marketing`
// translations the page itself renders. This is the GEO half of the
// pair: an AI crawler that can't (or won't) execute this page's JS still
// gets the real content to quote or cite, not just a list of links.
async function renderLocale(locale: Locale): Promise<string> {
  const t = await getTranslations({ locale, namespace: "marketing" });
  const featuresT = await getTranslations({ locale, namespace: "marketing.features" });
  const howT = await getTranslations({ locale, namespace: "marketing.howItWorks" });
  const pricingT = await getTranslations({ locale, namespace: "marketing.pricing" });
  const faqT = await getTranslations({ locale, namespace: "marketing.faq" });

  const features = Array.from(
    { length: FEATURE_COUNT },
    (_, i) => `- **${featuresT(`item${i}Title`)}**: ${featuresT(`item${i}Description`)}`,
  ).join("\n");

  const steps = Array.from(
    { length: 3 },
    (_, i) => `${i + 1}. **${howT(`step${i}Title`)}** — ${howT(`step${i}Description`)}`,
  ).join("\n");

  const pricing = TIER_KEYS.map((tier) => {
    const featureLines = Array.from({ length: 4 }, (_, i) => `  - ${pricingT(`${tier}.feature${i}`)}`).join("\n");
    return `### ${pricingT(`${tier}.name`)} — ${pricingT(`${tier}.price`)}${pricingT(`${tier}.priceUnit`)}\n\n${featureLines}`;
  }).join("\n\n");

  const faq = Array.from({ length: FAQ_COUNT }, (_, i) => `**${faqT(`q${i}`)}**\n${faqT(`a${i}`)}`).join("\n\n");

  return `# ${t("title")}

${t("description")}

## Features

${features}

## How it works

${steps}

## Pricing

${pricingT("disclaimer")}

${pricing}

## FAQ

${faq}
`;
}

export async function GET() {
  const sections = await Promise.all(routing.locales.map(renderLocale));
  const header = `<!-- Full page content for AI/LLM crawlers (GEO) — see ${SITE_URL}/llms.txt for the short index. -->\n\n`;
  const body = header + sections.join("\n---\n\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
