"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateConversationStatusAction } from "@/app/[locale]/(app)/app/inbox/actions";
import type { ConversationStatus } from "@/lib/supabase/database.types";

export function StatusToggle({ conversationId, status }: { conversationId: string; status: ConversationStatus }) {
  const t = useTranslations("inbox");
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextStatus: ConversationStatus = current === "open" ? "closed" : "open";

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await updateConversationStatusAction(conversationId, nextStatus);
      if (result.error) {
        setError(t("statusUpdateError"));
        return;
      }
      setCurrent(nextStatus);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={toggle} className="gap-1.5">
        {current === "open" ? <CheckCircle2 className="size-4" /> : <RotateCcw className="size-4" />}
        {current === "open" ? t("closeConversation") : t("reopenConversation")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
