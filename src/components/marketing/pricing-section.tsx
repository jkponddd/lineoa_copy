import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TIER_KEYS = ["free", "pro", "enterprise"] as const;
const FEATURE_COUNT = 4;

export function PricingSection() {
  const t = useTranslations("marketing.pricing");

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground text-balance">{t("description")}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TIER_KEYS.map((tier) => {
          const isHighlighted = tier === "pro";
          return (
            <Card key={tier} className={cn("flex flex-col", isHighlighted && "border-primary shadow-lg")}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{t(`${tier}.name`)}</CardTitle>
                  {isHighlighted ? <Badge>{t("popularBadge")}</Badge> : null}
                </div>
                <div className="pt-2">
                  <span className="text-3xl font-semibold">{t(`${tier}.price`)}</span>
                  <span className="text-sm text-muted-foreground">{t(`${tier}.priceUnit`)}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex flex-1 flex-col gap-2 text-sm">
                  {Array.from({ length: FEATURE_COUNT }, (_, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{t(`${tier}.feature${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <Button render={<Link href="/signup" />} nativeButton={false} variant={isHighlighted ? "default" : "outline"} className="w-full">
                  {t(`${tier}.cta`)}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </section>
  );
}
