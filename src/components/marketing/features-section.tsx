import { useTranslations } from "next-intl";
import { Inbox, Megaphone, LayoutGrid, BarChart3, Users, Languages } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const FEATURE_ICONS = [Inbox, Megaphone, LayoutGrid, BarChart3, Users, Languages] as const;

export function FeaturesSection() {
  const t = useTranslations("marketing.features");
  const items = [0, 1, 2, 3, 4, 5].map((i) => ({
    Icon: FEATURE_ICONS[i],
    title: t(`item${i}Title`),
    description: t(`item${i}Description`),
  }));

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground text-balance">{t("description")}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ Icon, title, description }) => (
          <Card key={title}>
            <CardContent className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
