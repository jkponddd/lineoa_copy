import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { AuditLogTable } from "@/components/admin/audit-log-table";

type AuditLogRow = {
  id: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown>;
  actor_email: string | null;
  actor_full_name: string | null;
  created_at: string;
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
        <AuditLogTable entries={entries} />
      )}
    </div>
  );
}
