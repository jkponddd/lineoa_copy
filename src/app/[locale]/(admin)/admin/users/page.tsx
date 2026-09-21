import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { AddMemberSheet } from "@/components/admin/add-member-sheet";
import { MemberRoleSelect } from "@/components/admin/member-role-select";
import { RemoveMemberButton } from "@/components/admin/remove-member-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableEmail")}</TableHead>
              <TableHead>{t("tableName")}</TableHead>
              <TableHead>{t("tableRole")}</TableHead>
              <TableHead>{t("tableJoined")}</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.email}</TableCell>
                <TableCell className="text-muted-foreground">{member.full_name || "—"}</TableCell>
                <TableCell>
                  <MemberRoleSelect memberId={member.id} initialRole={member.role} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(member.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {member.user_id !== currentUserId ? <RemoveMemberButton memberId={member.id} /> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
