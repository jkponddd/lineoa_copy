"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { removeMember } from "@/app/[locale]/(admin)/admin/users/actions";

export function RemoveMemberButton({ memberId }: { memberId: string }) {
  const t = useTranslations("orgMembers");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("removeConfirm"))) return;
          setError(null);
          startTransition(async () => {
            const result = await removeMember(memberId);
            if (result.error) {
              setError(result.error.includes("last owner") ? t("lastOwnerError") : result.error);
            }
          });
        }}
      >
        {t("removeButton")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
