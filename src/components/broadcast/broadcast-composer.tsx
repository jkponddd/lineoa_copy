"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { sendBroadcast } from "@/app/[locale]/(app)/app/broadcast/actions";
import type { BroadcastAudience } from "@/lib/supabase/database.types";

type Channel = { id: string; display_name: string };

const AUDIENCE_OPTIONS: BroadcastAudience[] = ["all", "conversations"];

export function BroadcastComposer({ channels, organizationId }: { channels: Channel[]; organizationId: string }) {
  const t = useTranslations("broadcast");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentState, setSentState] = useState<"immediate" | "scheduled" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Lazy-initialized once, not recomputed on every render — reading the
  // clock during render is impure and React's rules flag it; this only
  // needs to be "roughly now" for the datetime input's min bound anyway.
  const [minScheduleValue] = useState(() => new Date(Date.now() + 2 * 60 * 1000).toISOString().slice(0, 16));

  const channelById = new Map(channels.map((c) => [c.id, c.display_name]));
  const audienceLabel: Record<BroadcastAudience, string> = {
    all: t("audienceAll"),
    conversations: t("audienceConversations"),
  };

  function handleImageSelected(file: File) {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function submit() {
    const trimmed = content.trim();
    if ((!trimmed && !imageFile) || !channelId) return;
    if (scheduleEnabled && !scheduledAt) return;

    const confirmMessage = scheduleEnabled ? t("scheduleConfirm") : t("sendConfirm");
    if (!window.confirm(confirmMessage)) return;

    const wasScheduled = scheduleEnabled;
    setError(null);
    setSentState(null);

    startTransition(async () => {
      let imageMediaPath: string | null = null;

      if (imageFile) {
        setUploading(true);
        const extension = imageFile.name.split(".").pop() || "jpg";
        const path = `${organizationId}/broadcasts/${crypto.randomUUID()}.${extension}`;
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from("line-media")
          .upload(path, imageFile, { contentType: imageFile.type || "image/jpeg" });
        setUploading(false);

        if (uploadError) {
          setError(t("sendError"));
          return;
        }
        imageMediaPath = path;
      }

      const result = await sendBroadcast({
        lineChannelId: channelId,
        content: trimmed,
        imageMediaPath,
        audience,
        scheduledAt: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
      });

      if (result.error) {
        setError(result.error === "line_api_failed" ? t("sendError") : result.error);
        return;
      }

      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setScheduleEnabled(false);
      setScheduledAt("");
      setSentState(wasScheduled ? "scheduled" : "immediate");
    });
  }

  const busy = pending || uploading;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>{t("channelLabel")}</Label>
        <Select value={channelId} onValueChange={(value) => setChannelId(value ?? "")} disabled={busy}>
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
        <Label>{t("audienceLabel")}</Label>
        <Select value={audience} onValueChange={(value) => setAudience((value ?? "all") as BroadcastAudience)} disabled={busy}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue>{(value: BroadcastAudience) => audienceLabel[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {audienceLabel[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {audience === "all" ? t("audienceAllHint") : t("audienceConversationsHint")}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="broadcast-content">{t("messageLabel")}</Label>
        <Textarea
          id="broadcast-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("messagePlaceholder")}
          disabled={busy}
          rows={4}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("imageLabel")}</Label>
        {imagePreview ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={imagePreview} alt="" className="h-16 w-auto rounded border object-cover" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={busy}
              aria-label={t("removeImage")}
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleImageSelected(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              className="gap-1.5"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              {t("attachImage")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            disabled={busy}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="size-4 rounded border-input"
          />
          {t("scheduleToggle")}
        </label>
        {scheduleEnabled ? (
          <Input
            type="datetime-local"
            value={scheduledAt}
            min={minScheduleValue}
            disabled={busy}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full sm:w-72"
          />
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {sentState ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {sentState === "scheduled" ? t("scheduleSuccess") : t("sendSuccess")}
        </p>
      ) : null}

      <div>
        <Button
          type="button"
          disabled={busy || (!content.trim() && !imageFile) || !channelId || (scheduleEnabled && !scheduledAt)}
          onClick={submit}
        >
          {uploading ? t("uploadingImage") : scheduleEnabled ? t("scheduleButton") : t("sendButton")}
        </Button>
      </div>
    </div>
  );
}
