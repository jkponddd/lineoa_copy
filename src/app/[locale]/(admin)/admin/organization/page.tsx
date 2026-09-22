import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { OrganizationNameForm } from "@/components/admin/organization-name-form";
import { OrganizationLogoUploader } from "@/components/admin/organization-logo-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrganizationSettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url")
    .eq("id", membership.organization.id)
    .single();

  if (!organization) return null;

  return <OrganizationSettingsView organization={organization} />;
}

function OrganizationSettingsView({
  organization,
}: {
  organization: { id: string; name: string; slug: string; logo_url: string | null };
}) {
  const t = useTranslations("orgSettings");

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("logoTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationLogoUploader
            organizationId={organization.id}
            organizationName={organization.name}
            logoUrl={organization.logo_url}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("nameTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationNameForm initialName={organization.name} />
        </CardContent>
      </Card>
    </div>
  );
}
