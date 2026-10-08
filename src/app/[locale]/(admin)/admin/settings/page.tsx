import { useTranslations } from "next-intl";

import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { OrgDefaultsForm } from "@/components/admin/org-defaults-form";
import { DangerZoneCard } from "@/components/admin/danger-zone-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SystemSettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  return <SystemSettingsView organization={membership.organization} />;
}

function SystemSettingsView({
  organization,
}: {
  organization: { id: string; name: string; defaultLocale: string; defaultTimezone: string };
}) {
  const t = useTranslations("systemSettings");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("defaultsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgDefaultsForm initialLocale={organization.defaultLocale} initialTimezone={organization.defaultTimezone} />
        </CardContent>
      </Card>

      <DangerZoneCard organizationId={organization.id} organizationName={organization.name} />
    </div>
  );
}
