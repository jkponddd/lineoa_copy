"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Paperclip, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickerPickerDialog } from "@/components/inbox/sticker-picker-dialog";
import { createClient } from "@/lib/supabase/client";
import { sendFileReply, sendImageReply, sendTextReply } from "@/app/[locale]/(app)/app/inbox/actions";

export function ReplyComposer({ conversationId, organizationId }: { conversationId: string; organizationId: string }) {
  const t = useTranslations("inbox");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"image" | "file" | null>(null);
  const [pending, startTransition] = useTransition();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function submitText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setText("");
    startTransition(async () => {
      const result = await sendTextReply(conversationId, trimmed);
      if (result.error) {
        setError(t("sendError"));
        setText(trimmed);
      }
    });
  }

  async function handleImageSelected(file: File) {
    setError(null);
    setUploading("image");
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${organizationId}/${conversationId}/${crypto.randomUUID()}.${extension}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("line-media")
        .upload(path, file, { contentType: file.type || "image/jpeg" });

      if (uploadError) {
        setError(t("sendError"));
        return;
      }

      const result = await sendImageReply(conversationId, path);
      if (result.error) setError(t("sendError"));
    } finally {
      setUploading(null);
    }
  }

  async function handleFileSelected(file: File) {
    setError(null);
    setUploading("file");
    try {
      const extension = file.name.split(".").pop() || "bin";
      const path = `${organizationId}/${conversationId}/${crypto.randomUUID()}.${extension}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("line-media")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });

      if (uploadError) {
        setError(t("sendError"));
        return;
      }

      // LINE's Messaging API has no message type for sending a file
      // attachment back to a user (it can only receive one) — this goes
      // out as an ordinary text message containing a download link instead.
      // See sendFileReply for the long-lived signed URL that makes sense of.
      const result = await sendFileReply(conversationId, path, file.name);
      if (result.error) setError(t("sendError"));
    } finally {
      setUploading(null);
    }
  }

  const busy = pending || uploading !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleImageSelected(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={busy}
          aria-label={t("attachImage")}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFileSelected(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={busy}
          aria-label={t("attachFile")}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-4" />
        </Button>

        <StickerPickerDialog
          conversationId={conversationId}
          disabled={busy}
          onSent={() => setError(null)}
          onError={() => setError(t("sendError"))}
        />

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitText();
            }
          }}
          placeholder={t("composerPlaceholder")}
          disabled={busy}
          className="min-h-10 flex-1 resize-none"
          rows={1}
        />
        <Button type="button" size="icon" disabled={busy || !text.trim()} onClick={submitText}>
          <Send className="size-4" />
        </Button>
      </div>
      {uploading === "image" ? <p className="text-xs text-muted-foreground">{t("uploadingImage")}</p> : null}
      {uploading === "file" ? <p className="text-xs text-muted-foreground">{t("uploadingFile")}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
