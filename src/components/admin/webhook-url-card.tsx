"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WebhookUrlCard({ webhookUrl }: { webhookUrl: string }) {
  const t = useTranslations("lineChannels");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. no HTTPS, no permission) —
      // the URL is still selectable text in the input, so this is a
      // non-essential convenience, not something worth surfacing an error for.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("webhookUrlTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{t("webhookUrlDescription")}</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={webhookUrl}
            onFocus={(e) => e.target.select()}
            className="w-full min-w-0 rounded-md border bg-muted px-3 py-2 font-mono text-xs text-foreground"
          />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label={t("webhookUrlCopy")}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
