import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AuditLogRow = {
  id: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown>;
  actor_email: string | null;
  actor_full_name: string | null;
  created_at: string;
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  "member.added": "actionMemberAdded",
  "member.invited": "actionMemberInvited",
  "member.role_changed": "actionMemberRoleChanged",
  "member.removed": "actionMemberRemoved",
  "line_channel.connected": "actionLineChannelConnected",
  "line_channel.disconnected": "actionLineChannelDisconnected",
  "organization.renamed": "actionOrganizationRenamed",
  "organization.logo_updated": "actionOrganizationLogoUpdated",
};

export default async function AuditLogPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const { data: entries } = await supabase.rpc("get_audit_log", {
    p_organization_id: membership.organization.id,
  });

  return <AuditLogView entries={(entries ?? []) as AuditLogRow[]} />;
}

function AuditLogView({ entries }: { entries: AuditLogRow[] }) {
  const t = useTranslations("auditLog");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableTime")}</TableHead>
                <TableHead>{t("tableActor")}</TableHead>
                <TableHead>{t("tableAction")}</TableHead>
                <TableHead>{t("tableTarget")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const labelKey = ACTION_LABEL_KEYS[entry.action];
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{entry.actor_full_name || entry.actor_email || t("systemActor")}</TableCell>
                    <TableCell className="font-medium">{labelKey ? t(labelKey) : entry.action}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.target || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
