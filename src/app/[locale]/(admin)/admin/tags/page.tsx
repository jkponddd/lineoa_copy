import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { TagManager } from "@/components/admin/tag-manager";

export default async function TagsPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("organization_id", membership.organization.id)
    .order("name");

  return <TagsView organizationId={membership.organization.id} tags={tags ?? []} />;
}

function TagsView({ organizationId, tags }: { organizationId: string; tags: { id: string; name: string; color: string }[] }) {
  const t = useTranslations("tags");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
      </div>
      <TagManager organizationId={organizationId} tags={tags} />
    </div>
  );
}
