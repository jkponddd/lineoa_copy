import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection, getFaqItems } from "@/components/marketing/faq-section";
import { buildAlternates } from "@/lib/metadata-alternates";
import { SITE_URL } from "@/lib/site-url";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates(locale, ""),
  };
}

export default function HomePage() {
  const t = useTranslations("marketing");
  const faqT = useTranslations("marketing.faq");
  const faqItems = getFaqItems(faqT);

  // FAQPage + Organization structured data, built from the exact same
  // content rendered on the page (see getFaqItems) — search engines can
  // show these questions directly as rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "LINE OA Platform",
        url: SITE_URL,
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <>
      {/* Static JSON-LD built from this page's own translated content, not user input. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-16 sm:py-24 lg:flex-row lg:items-center lg:gap-12 lg:py-32">
        <div className="flex flex-col items-center gap-6 text-center lg:w-1/2 lg:items-start lg:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">{t("title")}</h1>
          <p className="max-w-xl text-muted-foreground text-balance">{t("description")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/signup" />} nativeButton={false}>
              {t("cta")}
            </Button>
            <Button size="lg" variant="outline" render={<Link href="#features" />} nativeButton={false}>
              {t("ctaSecondary")}
            </Button>
          </div>
        </div>
        <div className="flex justify-center lg:w-1/2">
          <HeroMockup />
        </div>
      </section>

      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FaqSection />

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("finalCtaTitle")}</h2>
        <p className="mt-3 text-muted-foreground text-balance">{t("finalCtaDescription")}</p>
        <Button size="lg" className="mt-6" render={<Link href="/signup" />} nativeButton={false}>
          {t("cta")}
        </Button>
      </section>
    </>
  );
}
