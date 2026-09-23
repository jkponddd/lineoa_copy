"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const ACTION_TYPES = Object.keys(ACTION_LABEL_KEYS);

export function AuditLogTable({ entries }: { entries: AuditLogRow[] }) {
  const t = useTranslations("auditLog");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  function actionLabel(action: string): string {
    const key = ACTION_LABEL_KEYS[action];
    return key ? t(key) : action;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = entries.filter((entry) => {
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      if (q) {
        const haystack = `${entry.actor_full_name ?? ""} ${entry.actor_email ?? ""} ${entry.target ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortNewestFirst ? -diff : diff;
    });
    return rows;
  }, [entries, search, actionFilter, sortNewestFirst]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="w-full sm:w-56" />
        <Select value={actionFilter} onValueChange={(value) => setActionFilter(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue>{(value: string) => (value === "all" ? t("filterAllActions") : actionLabel(value))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllActions")}</SelectItem>
            {ACTION_TYPES.map((action) => (
              <SelectItem key={action} value={action}>
                {actionLabel(action)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => setSortNewestFirst((v) => !v)}>
          {sortNewestFirst ? t("sortNewestFirst") : t("sortOldestFirst")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("filterEmpty")}</p>
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
              {filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</TableCell>
                  <TableCell>{entry.actor_full_name || entry.actor_email || t("systemActor")}</TableCell>
                  <TableCell className="font-medium">{actionLabel(entry.action)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.target || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
