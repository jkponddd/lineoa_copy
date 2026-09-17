import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("marketing");

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="text-muted-foreground max-w-xl text-balance">{t("description")}</p>
      <Button size="lg" render={<Link href="/signup" />} nativeButton={false}>
        {t("cta")}
      </Button>
    </div>
  );
}
