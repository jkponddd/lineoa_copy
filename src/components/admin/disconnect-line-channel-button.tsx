"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { disconnectLineChannel } from "@/app/[locale]/(admin)/admin/line-channels/actions";

export function DisconnectLineChannelButton({ lineChannelId, label }: { lineChannelId: string; label: string }) {
  const t = useTranslations("lineChannels");
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (window.confirm(t("disconnectConfirm"))) {
          startTransition(() => {
            void disconnectLineChannel(lineChannelId);
          });
        }
      }}
    >
      {label}
    </Button>
  );
}
