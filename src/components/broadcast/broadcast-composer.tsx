"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { BlockEditor } from "@/components/broadcast/block-editor";
import { BroadcastPreviewPanel } from "@/components/broadcast/broadcast-preview";
import { TestSendDialog } from "@/components/broadcast/test-send-dialog";
import type { BroadcastContact } from "@/components/broadcast/contact-picker-dialog";
import { toPersistedBlocks, type EditableBlock } from "@/components/broadcast/editable-block";
import { createBlock, blocksAreValid, type BroadcastBlock } from "@/lib/broadcast/blocks";
import {
  sendBroadcast,
  saveBroadcastDraft,
  updateBroadcastDraft,
  deleteBroadcastDraft,
  sendTestBroadcast,
} from "@/app/[locale]/(app)/app/broadcast/actions";
import type { BroadcastAudience } from "@/lib/supabase/database.types";

type Channel = { id: string; display_name: string };

// `id` is set only for a real draft being edited (further saves update it
// in place); a "copy" prefill passes id: null so it always creates a fresh
// row instead. `mediaUrlByPath` resolves each block's stored path to a
// displayable signed URL, since the composer never touches Storage paths
// directly for rendering.
export type InitialComposerValues = {
  id: string | null;
  lineChannelId: string;
  blocks: BroadcastBlock[];
  mediaUrlByPath: Record<string, string>;
  audience: BroadcastAudience;
};

const AUDIENCE_OPTIONS: BroadcastAudience[] = ["all", "conversations"];

function toEditableBlocks(blocks: BroadcastBlock[], mediaUrlByPath: Record<string, string>): EditableBlock[] {
  return blocks.map((block) => {
    if (block.type === "image") return { ...block, _fileUrl: mediaUrlByPath[block.mediaPath] };
    if (block.type === "video") {
      return { ...block, _fileUrl: mediaUrlByPath[block.mediaPath], _previewFileUrl: mediaUrlByPath[block.previewMediaPath] };
    }
    return block;
  });
}

export function BroadcastComposer({
  channels,
  organizationId,
  contacts,
  initialValues,
}: {
  channels: Channel[];
  organizationId: string;
  contacts: BroadcastContact[];
  initialValues: InitialComposerValues | null;
}) {
  const t = useTranslations("broadcast");
  const router = useRouter();

  const [channelId, setChannelId] = useState(initialValues?.lineChannelId ?? channels[0]?.id ?? "");
  const [blocks, setBlocks] = useState<EditableBlock[]>(() =>
    initialValues ? toEditableBlocks(initialValues.blocks, initialValues.mediaUrlByPath) : [createBlock("text")],
  );
  const [audience, setAudience] = useState<BroadcastAudience>(initialValues?.audience ?? "all");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentState, setSentState] = useState<"immediate" | "scheduled" | null>(null);
  const [draftSavedState, setDraftSavedState] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftPending, startDraftTransition] = useTransition();
  // Lazy-initialized once — reading the clock during render is impure and
  // React's rules flag it; this only needs to be "roughly now" for the
  // datetime input's min bound anyway.
  const [minScheduleValue] = useState(() => new Date(Date.now() + 2 * 60 * 1000).toISOString().slice(0, 16));

  const isEditingDraft = Boolean(initialValues?.id);
  const channelById = new Map(channels.map((c) => [c.id, c.display_name]));
  const audienceLabel: Record<BroadcastAudience, string> = {
    all: t("audienceAll"),
    conversations: t("audienceConversations"),
  };
  const contactsForChannel = contacts.filter((c) => c.lineChannelId === channelId);
  const isValid = blocksAreValid(toPersistedBlocks(blocks));

  async function uploadFile(file: File, fallbackExt: string): Promise<string | null> {
    const extension = file.name.split(".").pop() || fallbackExt;
    const path = `${organizationId}/broadcasts/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("line-media")
      .upload(path, file, { contentType: file.type || undefined });
    return uploadError ? null : path;
  }

  // Uploads any newly-picked (not-yet-uploaded) image/video files the
  // first time they're actually needed — submit, save draft, or test send
  // — rather than eagerly on selection. Returns null on any upload
  // failure. Resolved paths are written back into local state so a later
  // submit in the same session doesn't re-upload the same file.
  async function ensureBlocksUploaded(): Promise<BroadcastBlock[] | null> {
    const needsUpload = blocks.some((b) => b._file || b._previewFile);
    if (!needsUpload) return toPersistedBlocks(blocks);

    setUploading(true);
    const resolved: EditableBlock[] = [];
    for (const block of blocks) {
      if (block.type === "image" && block._file) {
        const path = await uploadFile(block._file, "jpg");
        if (!path) {
          setUploading(false);
          return null;
        }
        resolved.push({ ...block, mediaPath: path, _file: undefined });
        continue;
      }
      if (block.type === "video" && (block._file || block._previewFile)) {
        let mediaPath = block.mediaPath;
        let previewMediaPath = block.previewMediaPath;
        if (block._file) {
          const path = await uploadFile(block._file, "mp4");
          if (!path) {
            setUploading(false);
            return null;
          }
          mediaPath = path;
        }
        if (block._previewFile) {
          const path = await uploadFile(block._previewFile, "jpg");
          if (!path) {
            setUploading(false);
            return null;
          }
          previewMediaPath = path;
        }
        resolved.push({ ...block, mediaPath, previewMediaPath, _file: undefined, _previewFile: undefined });
        continue;
      }
      resolved.push(block);
    }
    setUploading(false);
    setBlocks(resolved);
    return toPersistedBlocks(resolved);
  }

  function baseParams(persistedBlocks: BroadcastBlock[]) {
    return { lineChannelId: channelId, blocks: persistedBlocks, audience };
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
      const persisted = await ensureBlocksUploaded();
      if (!persisted) {
        setError(t("sendError"));
        return;
      }

      const result = await sendBroadcast({
        ...baseParams(persisted),
        scheduledAt: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
        existingDraftId: initialValues?.id ?? null,
      });

      if (result.error) {
        setError(result.error === "line_api_failed" ? t("sendError") : result.error);
        return;
      }

      if (initialValues?.id) {
        router.push("/app/broadcast");
        return;
      }

      setBlocks([createBlock("text")]);
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
      const persisted = await ensureBlocksUploaded();
      if (!persisted) {
        setError(t("sendError"));
        return;
      }

      const params = baseParams(persisted);
      const result = isEditingDraft ? await updateBroadcastDraft(initialValues!.id!, params) : await saveBroadcastDraft(params);

      if (result.error) {
        setError(result.error);
        return;
      }

      setDraftSavedState(true);
      if (!isEditingDraft && "id" in result && result.id) {
        router.push(`/app/broadcast/new?draft=${result.id}`);
      }
    });
  }

  function submitDeleteDraft() {
    if (!initialValues?.id) return;
    if (!window.confirm(t("deleteDraftConfirm"))) return;

    startDraftTransition(async () => {
      const result = await deleteBroadcastDraft(initialValues.id!);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/app/broadcast");
    });
  }

  async function handleTestSend(targetUserId: string) {
    const persisted = await ensureBlocksUploaded();
    if (!persisted) return { error: "sendError" };
    return sendTestBroadcast({ ...baseParams(persisted), targetUserId });
  }

  const busy = pending || draftPending || uploading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isEditingDraft ? (
          <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("editingDraftBanner")}
          </p>
        ) : (
          <span />
        )}
        <TestSendDialog contacts={contactsForChannel} disabled={busy || !channelId} onSend={handleTestSend} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
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
            <Label>{t("blocksLabel")}</Label>
            <BlockEditor blocks={blocks} onChange={setBlocks} disabled={busy} />
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
          {draftSavedState ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("draftSaved")}</p> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={busy || !isValid || !channelId || (scheduleEnabled && !scheduledAt)}
              onClick={submitSend}
            >
              {uploading ? t("uploadingMedia") : scheduleEnabled ? t("scheduleButton") : t("sendButton")}
            </Button>
            <Button type="button" variant="outline" disabled={busy || !isValid || !channelId} onClick={submitDraft}>
              {isEditingDraft ? t("draftUpdateButton") : t("draftButton")}
            </Button>
            {isEditingDraft ? (
              <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={submitDeleteDraft}>
                {t("deleteDraftButton")}
              </Button>
            ) : null}
          </div>
        </div>

        <BroadcastPreviewPanel blocks={blocks} />
      </div>
    </div>
  );
}
