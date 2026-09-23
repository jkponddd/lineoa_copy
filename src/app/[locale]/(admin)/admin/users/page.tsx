import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { AddMemberSheet } from "@/components/admin/add-member-sheet";
import { UsersTable } from "@/components/admin/users-table";
import type { OrgRole } from "@/lib/supabase/database.types";

type MemberRow = {
  id: string;
  user_id: string;
  role: OrgRole;
  email: string;
  full_name: string | null;
  created_at: string;
};

export default async function UsersPage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: members } = membership
    ? await supabase.rpc("get_organization_members", { p_organization_id: membership.organization.id })
    : { data: [] };

  return <UsersView members={members ?? []} currentUserId={membership?.user.id ?? ""} />;
}

function UsersView({ members, currentUserId }: { members: MemberRow[]; currentUserId: string }) {
  const t = useTranslations("orgMembers");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <AddMemberSheet />
      </div>

      <UsersTable members={members} currentUserId={currentUserId} />
    </div>
  );
}
