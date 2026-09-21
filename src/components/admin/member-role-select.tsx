"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateMemberRole } from "@/app/[locale]/(admin)/admin/users/actions";
import type { OrgRole } from "@/lib/supabase/database.types";

export function MemberRoleSelect({ memberId, initialRole }: { memberId: string; initialRole: OrgRole }) {
  const t = useTranslations("orgMembers");
  const [role, setRole] = useState<OrgRole>(initialRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const roleLabels: Record<OrgRole, string> = {
    owner: t("roleOwner"),
    agent: t("roleAgent"),
    analyst: t("roleAnalyst"),
  };

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={role}
        disabled={pending}
        onValueChange={(value) => {
          const nextRole = value as OrgRole;
          const previousRole = role;
          setRole(nextRole);
          setError(null);
          startTransition(async () => {
            const result = await updateMemberRole(memberId, nextRole);
            if (result.error) {
              setRole(previousRole);
              setError(result.error.includes("last owner") ? t("lastOwnerError") : result.error);
            }
          });
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue>{(value: OrgRole) => roleLabels[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="owner">{t("roleOwner")}</SelectItem>
          <SelectItem value="agent">{t("roleAgent")}</SelectItem>
          <SelectItem value="analyst">{t("roleAnalyst")}</SelectItem>
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
