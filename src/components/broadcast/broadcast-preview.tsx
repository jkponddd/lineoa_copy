"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, MoreVertical, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EditableBlock, EditableFlexComponent } from "@/components/broadcast/editable-block";
import { cn } from "@/lib/utils";

const LINE_GREEN = "#06c755";

// A phone-shaped mockup, same idea as RichMenuPhonePreview — shows each
// block as its own chat bubble/card, in order, so reordering blocks is
// visually obvious, styled like an actual LINE chat screen (green header,
// OA avatar, light chat background) rather than a generic gray mockup.
// This is an intuitive per-block rendering, not a pixel-perfect simulation
// of LINE's own message layout — the JSON popup (opened via onOpenJson) is
// the exact ground truth of what will be sent, including how a button
// block merges with an adjacent image/text.
export function BroadcastPreviewPanel({
  blocks,
  channelName,
  onOpenJson,
}: {
  blocks: EditableBlock[];
  channelName?: string;
  onOpenJson: () => void;
}) {
  const t = useTranslations("broadcast");
  const captureRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  async function handleCapture() {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      // modern-screenshot (SVG foreignObject-based) rather than html2canvas
      // — html2canvas re-implements CSS parsing itself and can't handle the
      // oklch()/lab() color functions this Tailwind v4 theme uses, throwing
      // "unsupported color function" instead of capturing anything.
      const { domToPng } = await import("modern-screenshot");
      const dataUrl = await domToPng(captureRef.current, { scale: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "broadcast-preview.png";
      // Some browsers only reliably trigger the download when the anchor
      // is actually attached to the document at click time.
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t("previewTitle")}</p>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" disabled={capturing} className="gap-1" onClick={handleCapture}>
            <Camera className="size-3.5" />
            {capturing ? t("previewCapturing") : t("previewCapture")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onOpenJson}>
            {t("previewModeJson")}
          </Button>
        </div>
      </div>

      <PhoneMockup blocks={blocks} channelName={channelName} captureRef={captureRef} />
    </div>
  );
}

function PhoneMockup({
  blocks,
  channelName,
  captureRef,
}: {
  blocks: EditableBlock[];
  channelName?: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("broadcast");
  const initial = (channelName || "OA").slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto w-full max-w-70">
      <div ref={captureRef} className="rounded-[28px] border-4 border-foreground/80 bg-background p-1.5 shadow-sm">
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-border">
          <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: LINE_GREEN }}>
            <ArrowLeft className="size-4 text-white" />
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/90 text-[10px] font-bold" style={{ color: LINE_GREEN }}>
              {initial}
            </span>
            <span className="flex-1 truncate text-xs font-medium text-white">{channelName || "LINE OA"}</span>
            <MoreVertical className="size-4 text-white" />
          </div>

          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto p-3" style={{ backgroundColor: "#e7e8ea" }}>
            {blocks.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("previewEmpty")}</p>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="flex items-end gap-1.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                    {initial}
                  </span>
                  <BlockBubble block={block} />
                </div>
              ))
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

  if (block.type === "imagemap") {
    if (!block._fileUrl) return <EmptyBlockHint label={t("blockImagemap")} />;
    return (
      <div className="relative w-fit max-w-full overflow-hidden rounded-lg rounded-tl-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview / public proxy URL */}
        <img src={block._fileUrl} alt="" className="max-h-40 w-fit max-w-full object-cover" />
        {block.areas.map((area) => (
          <div
            key={area.id}
            className="absolute border border-primary/70 bg-primary/10"
            style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` }}
          />
        ))}
      </div>
    );
  }

  if (block.type === "flex") {
    return (
      <div className="w-full overflow-hidden rounded-lg rounded-tl-sm border border-border bg-background">
        {block.hero ? <FlexComponentPreview component={block.hero} /> : null}
        <div className="flex flex-col gap-1.5 p-2">
          <FlexComponentPreview component={block.body} />
        </div>
        {block.footer ? (
          <div className="flex flex-col gap-1.5 border-t border-border p-2">
            <FlexComponentPreview component={block.footer} />
          </div>
        ) : null}
      </div>
    );
  }

  // button
  return (
    <div className="w-full rounded-md border border-border py-1.5 text-center text-xs font-medium text-primary">
      {block.label.trim() || t("linkLabelPlaceholder")}
    </div>
  );
}

const FLEX_TEXT_SIZE_CLASS: Record<string, string> = { xs: "text-[9px]", sm: "text-[10px]", md: "text-xs", lg: "text-sm", xl: "text-base" };

function FlexComponentPreview({ component }: { component: EditableFlexComponent }) {
  if (component.type === "box") {
    return (
      <div
        className={cn(
          "flex gap-1.5",
          component.layout === "horizontal" ? "flex-row" : component.layout === "baseline" ? "flex-row items-baseline" : "flex-col",
        )}
      >
        {component.children.map((child) => (
          <FlexComponentPreview key={child.id} component={child} />
        ))}
      </div>
    );
  }

  if (component.type === "text") {
    return (
      <p
        className={cn(
          FLEX_TEXT_SIZE_CLASS[component.size],
          component.weight === "bold" && "font-bold",
          component.align === "center" && "text-center",
          component.align === "end" && "text-right",
          "wrap-break-word",
        )}
      >
        {component.text || " "}
      </p>
    );
  }

  if (component.type === "image") {
    if (!component._fileUrl) return <div className="h-16 w-full rounded bg-muted" />;
    // eslint-disable-next-line @next/next/no-img-element -- local preview / signed URL
    return <img src={component._fileUrl} alt="" className="w-full rounded object-cover" />;
  }

  if (component.type === "button") {
    return (
      <div className="w-full rounded-md border border-primary py-1 text-center text-[10px] text-primary">
        {component.action.label.trim() || "…"}
      </div>
    );
  }

  return <div className="h-px w-full bg-border" />;
}

function EmptyBlockHint({ label }: { label: string }) {
  return (
    <div className="flex aspect-video w-full max-w-50 items-center justify-center rounded-lg border border-dashed bg-muted text-[10px] text-muted-foreground">
      {label}
    </div>
  );
}

