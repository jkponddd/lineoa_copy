import { useTranslations } from "next-intl";

export default function AdminHomePage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      <p className="font-medium text-foreground">{t("sectionTitle")}</p>
      <p className="text-sm">{tCommon("placeholder")}</p>
    </div>
  );
}
