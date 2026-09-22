import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// No payment provider is wired up yet — this is a placeholder for where
// plan/billing management will live once one is chosen. Deliberately not
// pretending to have real plan data.
export default function BillingPage() {
  const t = useTranslations("billing");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{t("currentPlanTitle")}</CardTitle>
            <Badge variant="outline">{t("planFree")}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <CreditCard className="size-6" />
            <p className="text-sm">{t("comingSoon")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
