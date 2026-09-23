"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { deleteBroadcastDraft } from "@/app/[locale]/(app)/app/broadcast/actions";

export function DeleteDraftButton({ broadcastId }: { broadcastId: string }) {
  const t = useTranslations("broadcast");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("deleteDraftConfirm"))) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteBroadcastDraft(broadcastId);
            if (result.error) setError(t("actionError"));
          });
        }}
      >
        {pending ? t("deletingDraft") : t("deleteDraftButton")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
