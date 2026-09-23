"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { GripVertical, ChevronUp, ChevronDown, X, Type, Image as ImageIcon, Video, Link as LinkIcon, Map, LayoutTemplate, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagemapEditor } from "@/components/broadcast/imagemap-editor";
import { FlexEditor } from "@/components/broadcast/flex-editor";
import { MAX_BLOCKS, createBlock, type BroadcastBlockType } from "@/lib/broadcast/blocks";
import type { EditableBlock } from "@/components/broadcast/editable-block";
import { cn } from "@/lib/utils";

const BLOCK_TYPES: BroadcastBlockType[] = ["text", "image", "video", "button", "imagemap", "flex"];
const BLOCK_ICON: Record<BroadcastBlockType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  video: Video,
  button: LinkIcon,
  imagemap: Map,
  flex: LayoutTemplate,
};

// A small, dependency-free reorderable list — pointer-based drag (same
// technique as RichMenuPhonePreview's area editor) for the "drag to
// reorder" feel the user asked for, plus always-available up/down buttons
// so reordering works reliably on touch devices too (native HTML5
// drag-and-drop doesn't work well on mobile without extra polyfills, which
// would work against this project's mobile-first UX requirements).
export function BlockEditor({
  blocks,
  onChange,
  disabled,
}: {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("broadcast");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= blocks.length || from === to) return;
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function updateBlock(index: number, patch: Partial<EditableBlock>) {
    const next = [...blocks];
    next[index] = { ...next[index], ...patch } as EditableBlock;
    onChange(next);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function addBlock(type: BroadcastBlockType) {
    onChange([...blocks, createBlock(type) as EditableBlock]);
  }

  const blockTypeLabel: Record<BroadcastBlockType, string> = {
    text: t("blockText"),
    image: t("blockImage"),
    video: t("blockVideo"),
    button: t("blockButton"),
    imagemap: t("blockImagemap"),
    flex: t("blockFlex"),
  };

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          draggable={!disabled}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null) move(dragIndex, index);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={cn("flex gap-2 rounded-lg border bg-card p-3", dragIndex === index && "opacity-50")}
        >
          <div className="flex flex-col items-center gap-1 pt-1 text-muted-foreground">
            <GripVertical className="size-4 cursor-grab" />
            <button type="button" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label={t("blockMoveUp")}>
              <ChevronUp className="size-3.5 disabled:opacity-30" />
            </button>
            <button
              type="button"
              disabled={disabled || index === blocks.length - 1}
              onClick={() => move(index, index + 1)}
              aria-label={t("blockMoveDown")}
            >
              <ChevronDown className="size-3.5 disabled:opacity-30" />
            </button>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {(() => {
                  const Icon = BLOCK_ICON[block.type];
                  return <Icon className="size-3.5" />;
                })()}
                {blockTypeLabel[block.type]}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeBlock(index)}
                aria-label={t("blockRemove")}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>

            <BlockFields block={block} disabled={disabled} onChange={(patch) => updateBlock(index, patch)} />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((type) => {
          const Icon = BLOCK_ICON[type];
          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || blocks.length >= MAX_BLOCKS}
              className="gap-1.5"
              onClick={() => addBlock(type)}
            >
              <Plus className="size-3.5" />
              <Icon className="size-3.5" />
              {blockTypeLabel[type]}
            </Button>
          );
        })}
      </div>
      {blocks.length >= MAX_BLOCKS ? <p className="text-xs text-muted-foreground">{t("blockMaxReached", { max: MAX_BLOCKS })}</p> : null}
    </div>
  );
}

function BlockFields({
  block,
  disabled,
  onChange,
}: {
  block: EditableBlock;
  disabled?: boolean;
  onChange: (patch: Partial<EditableBlock>) => void;
}) {
  const t = useTranslations("broadcast");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  if (block.type === "text") {
    return (
      <Textarea
        value={block.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={t("messagePlaceholder")}
        disabled={disabled}
        rows={3}
      />
    );
  }

  if (block.type === "image") {
    return (
      <div className="flex items-center gap-2">
        {block._fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL or signed Storage URL preview
          <img src={block._fileUrl} alt="" className="h-16 w-auto rounded border object-cover" />
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onChange({ _file: file, _fileUrl: URL.createObjectURL(file), mediaPath: "" });
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
          {block._fileUrl ? t("attachImageChange") : t("attachImage")}
        </Button>
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {block._fileUrl ? (
            <video src={block._fileUrl} className="h-16 w-auto rounded border" muted />
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onChange({ _file: file, _fileUrl: URL.createObjectURL(file), mediaPath: "" });
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
            {block._fileUrl ? t("attachVideoChange") : t("attachVideo")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {block._previewFileUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL or signed Storage URL preview
            <img src={block._previewFileUrl} alt="" className="h-12 w-auto rounded border object-cover" />
          ) : null}
          <input
            ref={previewInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onChange({ _previewFile: file, _previewFileUrl: URL.createObjectURL(file), previewMediaPath: "" });
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => previewInputRef.current?.click()}>
            {t("attachVideoThumbnail")}
          </Button>
        </div>
      </div>
    );
  }

  if (block.type === "imagemap") {
    return <ImagemapEditor block={block} disabled={disabled} onChange={onChange} />;
  }

  if (block.type === "flex") {
    return <FlexEditor block={block} disabled={disabled} onChange={onChange} />;
  }

  // button
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t("linkLabelLabel")}</Label>
        <Input value={block.label} onChange={(e) => onChange({ label: e.target.value })} placeholder={t("linkLabelPlaceholder")} disabled={disabled} />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t("linkUrlLabel")}</Label>
        <Input
          type="url"
          value={block.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder={t("linkUrlPlaceholder")}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
