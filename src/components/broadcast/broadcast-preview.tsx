"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { previewLineMessages, type EditableBlock } from "@/components/broadcast/editable-block";

// A phone-shaped mockup, same idea as RichMenuPhonePreview — shows each
// block as its own chat bubble/card, in order, so reordering blocks is
// visually obvious. This is an intuitive per-block rendering, not a
// pixel-perfect simulation of LINE's own message layout — the JSON view
// (toggled alongside it) is the exact ground truth of what will be sent,
// including how a button block merges with an adjacent image/text.
export function BroadcastPreviewPanel({ blocks }: { blocks: EditableBlock[] }) {
  const t = useTranslations("broadcast");
  const [mode, setMode] = useState<"preview" | "json">("preview");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t("previewTitle")}</p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={mode === "preview" ? "default" : "outline"} onClick={() => setMode("preview")}>
            {t("previewModePreview")}
          </Button>
          <Button type="button" size="sm" variant={mode === "json" ? "default" : "outline"} onClick={() => setMode("json")}>
            {t("previewModeJson")}
          </Button>
        </div>
      </div>

      {mode === "preview" ? <PhoneMockup blocks={blocks} /> : <JsonView blocks={blocks} />}
    </div>
  );
}

function PhoneMockup({ blocks }: { blocks: EditableBlock[] }) {
  const t = useTranslations("broadcast");

  return (
    <div className="mx-auto w-full max-w-70">
      <div className="rounded-[28px] border-4 border-foreground/80 bg-background p-1.5 shadow-sm">
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-muted/30">
          <div className="flex flex-col gap-1.5 bg-background p-2.5">
            <div className="h-1.5 w-16 rounded-full bg-muted" />
          </div>

          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto border-t border-border p-3">
            {blocks.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("previewEmpty")}</p>
            ) : (
              blocks.map((block) => <BlockBubble key={block.id} block={block} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockBubble({ block }: { block: EditableBlock }) {
  const t = useTranslations("broadcast");

  if (block.type === "text") {
    if (!block.text.trim()) return null;
    return (
      <div className="w-fit max-w-full rounded-lg rounded-tl-sm bg-muted px-2.5 py-1.5 text-xs whitespace-pre-wrap wrap-break-word">
        {block.text}
      </div>
    );
  }

  if (block.type === "image") {
    if (!block._fileUrl) return <EmptyBlockHint label={t("blockImage")} />;
    // eslint-disable-next-line @next/next/no-img-element -- local preview / signed URL
    return <img src={block._fileUrl} alt="" className="max-h-40 w-fit max-w-full rounded-lg rounded-tl-sm object-cover" />;
  }

  if (block.type === "video") {
    if (!block._fileUrl) return <EmptyBlockHint label={t("blockVideo")} />;
    return <video src={block._fileUrl} controls className="max-h-40 w-fit max-w-full rounded-lg rounded-tl-sm" />;
  }

  // button
  return (
    <div className="w-full rounded-md border border-border py-1.5 text-center text-xs font-medium text-primary">
      {block.label.trim() || t("linkLabelPlaceholder")}
    </div>
  );
}

function EmptyBlockHint({ label }: { label: string }) {
  return (
    <div className="flex aspect-video w-full max-w-50 items-center justify-center rounded-lg border border-dashed bg-muted text-[10px] text-muted-foreground">
      {label}
    </div>
  );
}

function JsonView({ blocks }: { blocks: EditableBlock[] }) {
  const messages = previewLineMessages(blocks);
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed">
      {JSON.stringify(messages, null, 2)}
    </pre>
  );
}
