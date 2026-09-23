"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberRoleSelect } from "@/components/admin/member-role-select";
import { RemoveMemberButton } from "@/components/admin/remove-member-button";
import type { OrgRole } from "@/lib/supabase/database.types";

type MemberRow = {
  id: string;
  user_id: string;
  role: OrgRole;
  email: string;
  full_name: string | null;
  created_at: string;
};

const ROLE_FILTERS: (OrgRole | "all")[] = ["all", "owner", "agent", "analyst"];

export function UsersTable({ members, currentUserId }: { members: MemberRow[]; currentUserId: string }) {
  const t = useTranslations("orgMembers");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<OrgRole | "all">("all");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const roleLabel: Record<OrgRole | "all", string> = {
    all: t("filterAllRoles"),
    owner: t("roleOwner"),
    agent: t("roleAgent"),
    analyst: t("roleAnalyst"),
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = members.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (q && !m.email.toLowerCase().includes(q) && !(m.full_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortNewestFirst ? -diff : diff;
    });
    return rows;
  }, [members, search, roleFilter, sortNewestFirst]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="w-full sm:w-56" />
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter((value ?? "all") as OrgRole | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{(value: OrgRole | "all") => roleLabel[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((role) => (
              <SelectItem key={role} value={role}>
                {roleLabel[role]}
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
                <TableHead>{t("tableEmail")}</TableHead>
                <TableHead>{t("tableName")}</TableHead>
                <TableHead>{t("tableRole")}</TableHead>
                <TableHead>{t("tableJoined")}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell className="text-muted-foreground">{member.full_name || "—"}</TableCell>
                  <TableCell>
                    <MemberRoleSelect memberId={member.id} initialRole={member.role} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(member.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {member.user_id !== currentUserId ? <RemoveMemberButton memberId={member.id} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
