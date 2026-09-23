"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { TemplatePickerDialog } from "@/components/broadcast/template-picker-dialog";
import { BroadcastPreview } from "@/components/broadcast/broadcast-preview";
import { ContactPickerDialog, type BroadcastContact } from "@/components/broadcast/contact-picker-dialog";
import {
  sendBroadcast,
  saveBroadcastDraft,
  updateBroadcastDraft,
  deleteBroadcastDraft,
  sendTestBroadcast,
} from "@/app/[locale]/(app)/app/broadcast/actions";
import type { BroadcastAudience, BroadcastTemplate } from "@/lib/supabase/database.types";

type Channel = { id: string; display_name: string };

export type InitialDraft = {
  id: string;
  lineChannelId: string;
  template: BroadcastTemplate;
  content: string | null;
  imageMediaPath: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  audience: BroadcastAudience;
};

const AUDIENCE_OPTIONS: BroadcastAudience[] = ["all", "conversations"];

export function BroadcastComposer({
  channels,
  organizationId,
  contacts,
  initialDraft,
}: {
  channels: Channel[];
  organizationId: string;
  contacts: BroadcastContact[];
  initialDraft: InitialDraft | null;
}) {
  const t = useTranslations("broadcast");
  const router = useRouter();

  const [channelId, setChannelId] = useState(initialDraft?.lineChannelId ?? channels[0]?.id ?? "");
  const [template, setTemplate] = useState<BroadcastTemplate>(initialDraft?.template ?? "text");
  const [content, setContent] = useState(initialDraft?.content ?? "");
  const [audience, setAudience] = useState<BroadcastAudience>(initialDraft?.audience ?? "all");
  const [linkUrl, setLinkUrl] = useState(initialDraft?.linkUrl ?? "");
  const [linkLabel, setLinkLabel] = useState(initialDraft?.linkLabel ?? "");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMediaPath, setImageMediaPath] = useState<string | null>(initialDraft?.imageMediaPath ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialDraft?.imageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [sentState, setSentState] = useState<"immediate" | "scheduled" | null>(null);
  const [draftSavedState, setDraftSavedState] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftPending, startDraftTransition] = useTransition();

  const [testMode, setTestMode] = useState<"contact" | "uid">("contact");
  const [testTarget, setTestTarget] = useState<BroadcastContact | null>(null);
  const [testUid, setTestUid] = useState("");
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testPending, startTestTransition] = useTransition();

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

  const contactsForChannel = contacts.filter((c) => c.lineChannelId === channelId);
  // Manual UID entry gets a free "who is this?" preview whenever the typed
  // UID happens to match someone who has an existing conversation on this
  // channel — the only place this app knows a LINE user's name/picture at
  // all, per the user's own confirmed requirement.
  const uidMatch = contactsForChannel.find((c) => c.lineUserId === testUid.trim()) ?? null;

  function handleImageSelected(file: File) {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageMediaPath(null);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageMediaPath(null);
  }

  const hasImage = Boolean(imageFile || imageMediaPath);
  const isValid =
    template === "text"
      ? content.trim().length > 0
      : template === "image_text"
        ? content.trim().length > 0 || hasImage
        : hasImage && linkUrl.trim().length > 0 && linkLabel.trim().length > 0;

  // Uploads a newly-picked image file the first time it's actually needed
  // (submit, save draft, or test send) rather than eagerly on selection —
  // avoids uploading a file the user might still remove before sending.
  // Returns null on upload failure.
  async function ensureImageUploaded(): Promise<{ ok: true; path: string | null } | { ok: false }> {
    if (!imageFile) return { ok: true, path: imageMediaPath };

    setUploading(true);
    const extension = imageFile.name.split(".").pop() || "jpg";
    const path = `${organizationId}/broadcasts/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("line-media")
      .upload(path, imageFile, { contentType: imageFile.type || "image/jpeg" });
    setUploading(false);

    if (uploadError) return { ok: false };

    setImageFile(null);
    setImageMediaPath(path);
    return { ok: true, path };
  }

  function baseParams(imgPath: string | null) {
    return {
      lineChannelId: channelId,
      template,
      content: content.trim() || null,
      imageMediaPath: imgPath,
      linkUrl: template === "image_link" ? linkUrl.trim() || null : null,
      linkLabel: template === "image_link" ? linkLabel.trim() || null : null,
      audience,
    };
  }

  function submitSend() {
    if (!isValid || !channelId) return;
    if (scheduleEnabled && !scheduledAt) return;

    const confirmMessage = scheduleEnabled ? t("scheduleConfirm") : t("sendConfirm");
    if (!window.confirm(confirmMessage)) return;

    const wasScheduled = scheduleEnabled;
    setError(null);
    setSentState(null);
    setDraftSavedState(false);

    startTransition(async () => {
      const uploaded = await ensureImageUploaded();
      if (!uploaded.ok) {
        setError(t("sendError"));
        return;
      }

      const result = await sendBroadcast({
        ...baseParams(uploaded.path),
        scheduledAt: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
        existingDraftId: initialDraft?.id ?? null,
      });

      if (result.error) {
        setError(result.error === "line_api_failed" ? t("sendError") : result.error);
        return;
      }

      if (initialDraft) {
        router.push("/app/broadcast");
        return;
      }

      setContent("");
      clearImage();
      setLinkUrl("");
      setLinkLabel("");
      setScheduleEnabled(false);
      setScheduledAt("");
      setSentState(wasScheduled ? "scheduled" : "immediate");
    });
  }

  function submitDraft() {
    if (!isValid || !channelId) return;
    setError(null);
    setSentState(null);
    setDraftSavedState(false);

    startDraftTransition(async () => {
      const uploaded = await ensureImageUploaded();
      if (!uploaded.ok) {
        setError(t("sendError"));
        return;
      }

      const params = baseParams(uploaded.path);
      const result = initialDraft
        ? await updateBroadcastDraft(initialDraft.id, params)
        : await saveBroadcastDraft(params);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDraftSavedState(true);
      if (!initialDraft && "id" in result && result.id) {
        router.push(`/app/broadcast?draft=${result.id}`);
      }
    });
  }

  function submitDeleteDraft() {
    if (!initialDraft) return;
    if (!window.confirm(t("deleteDraftConfirm"))) return;

    startDraftTransition(async () => {
      const result = await deleteBroadcastDraft(initialDraft.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/app/broadcast");
    });
  }

  function submitTestSend() {
    const targetUserId = testMode === "contact" ? (testTarget?.lineUserId ?? "") : testUid.trim();
    if (!targetUserId || !isValid || !channelId) return;

    setTestError(null);
    setTestSuccess(false);

    startTestTransition(async () => {
      const uploaded = await ensureImageUploaded();
      if (!uploaded.ok) {
        setTestError(t("sendError"));
        return;
      }

      const result = await sendTestBroadcast({ ...baseParams(uploaded.path), targetUserId });
      if (result.error) {
        setTestError(result.error === "line_api_failed" ? t("sendError") : result.error);
        return;
      }
      setTestSuccess(true);
    });
  }

  const busy = pending || draftPending || uploading;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-3">
        {initialDraft ? (
          <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("editingDraftBanner")}
          </div>
        ) : null}

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
          <Label>{t("templateLabel")}</Label>
          <TemplatePickerDialog template={template} onSelect={setTemplate} disabled={busy} />
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
          <Label htmlFor="broadcast-content">{template === "text" ? t("messageLabel") : t("messageLabelOptional")}</Label>
          <Textarea
            id="broadcast-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("messagePlaceholder")}
            disabled={busy}
            rows={4}
          />
        </div>

        {template !== "text" ? (
          <div className="flex flex-col gap-1.5">
            <Label>{template === "image_link" ? t("imageLabelRequired") : t("imageLabel")}</Label>
            {imagePreview ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL or signed Storage URL preview */}
                <img src={imagePreview} alt="" className="h-16 w-auto rounded border object-cover" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  aria-label={t("removeImage")}
                  onClick={clearImage}
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
        ) : null}

        {template === "image_link" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broadcast-link-label">{t("linkLabelLabel")}</Label>
              <Input
                id="broadcast-link-label"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder={t("linkLabelPlaceholder")}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broadcast-link-url">{t("linkUrlLabel")}</Label>
              <Input
                id="broadcast-link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder={t("linkUrlPlaceholder")}
                disabled={busy}
              />
            </div>
          </div>
        ) : null}

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
        {draftSavedState ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("draftSaved")}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={busy || !isValid || !channelId || (scheduleEnabled && !scheduledAt)} onClick={submitSend}>
            {uploading ? t("uploadingImage") : scheduleEnabled ? t("scheduleButton") : t("sendButton")}
          </Button>
          <Button type="button" variant="outline" disabled={busy || !isValid || !channelId} onClick={submitDraft}>
            {initialDraft ? t("draftUpdateButton") : t("draftButton")}
          </Button>
          {initialDraft ? (
            <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={submitDeleteDraft}>
              {t("deleteDraftButton")}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-sm font-medium">{t("testSendTitle")}</p>

          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={testMode === "contact" ? "default" : "outline"}
              onClick={() => setTestMode("contact")}
            >
              {t("testSendModeContact")}
            </Button>
            <Button type="button" size="sm" variant={testMode === "uid" ? "default" : "outline"} onClick={() => setTestMode("uid")}>
              {t("testSendModeUid")}
            </Button>
          </div>

          {testMode === "contact" ? (
            <div className="flex items-center gap-2">
              <ContactPickerDialog contacts={contactsForChannel} onSelect={setTestTarget} disabled={testPending} />
              {testTarget ? (
                <div className="flex items-center gap-1.5 text-sm">
                  <Avatar className="size-6">
                    {testTarget.pictureUrl ? <AvatarImage src={testTarget.pictureUrl} alt="" /> : null}
                    <AvatarFallback>{(testTarget.displayName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{testTarget.displayName || t("testSendUnnamedContact")}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Input
                value={testUid}
                onChange={(e) => setTestUid(e.target.value)}
                placeholder={t("testSendUidPlaceholder")}
                disabled={testPending}
              />
              {testUid.trim() ? (
                uidMatch ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Avatar className="size-5">
                      {uidMatch.pictureUrl ? <AvatarImage src={uidMatch.pictureUrl} alt="" /> : null}
                      <AvatarFallback>{(uidMatch.displayName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{t("testSendUidResolved", { name: uidMatch.displayName || t("testSendUnnamedContact") })}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("testSendUidUnresolved")}</p>
                )
              ) : null}
            </div>
          )}

          {testError ? <p className="text-xs text-destructive">{testError}</p> : null}
          {testSuccess ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("testSendSuccess")}</p> : null}

          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                testPending ||
                busy ||
                !isValid ||
                !channelId ||
                (testMode === "contact" ? !testTarget : !testUid.trim())
              }
              onClick={submitTestSend}
            >
              {testPending ? t("testSendSending") : t("testSendButton")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t("previewTitle")}</p>
        <BroadcastPreview template={template} content={content} imageUrl={imagePreview} linkLabel={linkLabel} />
      </div>
    </div>
  );
}
