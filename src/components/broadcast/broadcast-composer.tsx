"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendBroadcast } from "@/app/[locale]/(app)/app/broadcast/actions";

type Channel = { id: string; display_name: string };

export function BroadcastComposer({ channels }: { channels: Channel[] }) {
  const t = useTranslations("broadcast");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const channelById = new Map(channels.map((c) => [c.id, c.display_name]));

  function submit() {
    const trimmed = content.trim();
    if (!trimmed || !channelId) return;
    if (!window.confirm(t("sendConfirm"))) return;

    setError(null);
    setSent(false);
    startTransition(async () => {
      const result = await sendBroadcast(channelId, trimmed);
      if (result.error) {
        setError(result.error === "line_api_failed" ? t("sendError") : result.error);
        return;
      }
      setContent("");
      setSent(true);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>{t("channelLabel")}</Label>
        <Select value={channelId} onValueChange={(value) => setChannelId(value ?? "")} disabled={pending}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue>{(value: string) => channelById.get(value) ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="broadcast-content">{t("messageLabel")}</Label>
        <Textarea
          id="broadcast-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("messagePlaceholder")}
          disabled={pending}
          rows={4}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {sent ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("sendSuccess")}</p> : null}

      <div>
        <Button type="button" disabled={pending || !content.trim() || !channelId} onClick={submit}>
          {t("sendButton")}
        </Button>
      </div>
    </div>
  );
}
