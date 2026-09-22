"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cancelScheduledBroadcast } from "@/app/[locale]/(app)/app/broadcast/actions";

export function CancelBroadcastButton({ broadcastId }: { broadcastId: string }) {
  const t = useTranslations("broadcast");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("cancelConfirm"))) return;
          setError(null);
          startTransition(async () => {
            const result = await cancelScheduledBroadcast(broadcastId);
            if (result.error) setError(t("actionError"));
          });
        }}
      >
        {pending ? t("cancelling") : t("cancelButton")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
