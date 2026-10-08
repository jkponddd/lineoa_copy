import { useTranslations } from "next-intl";
import { Link2, MessagesSquare, LineChart } from "lucide-react";

const STEP_ICONS = [Link2, MessagesSquare, LineChart] as const;

// Exported so the page can build matching HowTo JSON-LD from the exact
// same steps shown on screen (same reasoning as faq-section's getFaqItems).
export function getHowItWorksSteps(t: ReturnType<typeof useTranslations>) {
  return [0, 1, 2].map((i) => ({
    Icon: STEP_ICONS[i],
    title: t(`step${i}Title`),
    description: t(`step${i}Description`),
  }));
}

export function HowItWorksSection() {
  const t = useTranslations("marketing.howItWorks");
  const steps = getHowItWorksSteps(t);

  return (
    <section id="how-it-works" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
          <p className="mt-3 text-muted-foreground text-balance">{t("description")}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map(({ Icon, title, description }, index) => (
            <div key={title} className="flex flex-col items-center gap-3 text-center">
              <span className="relative flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon className="size-5" />
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-background text-[11px] font-semibold ring-1 ring-border">
                  {index + 1}
                </span>
              </span>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground text-balance">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
