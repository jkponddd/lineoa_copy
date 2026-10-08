import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-6" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("notFoundTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("notFoundDescription")}</p>
      </div>
      <Button render={<Link href="/" />} nativeButton={false}>
        {t("notFoundBackHome")}
      </Button>
    </div>
  );
}
