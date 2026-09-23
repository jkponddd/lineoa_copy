"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichMenuPhonePreview } from "@/components/rich-menu/rich-menu-phone-preview";
import type { PercentBounds } from "@/lib/line/rich-menu-layouts";
import type { ImagemapAction } from "@/lib/broadcast/blocks";
import type { EditableBlock } from "@/components/broadcast/editable-block";

type ImagemapBlock = Extract<EditableBlock, { type: "imagemap" }>;

const MAX_AREAS = 20;

// Reuses RichMenuPhonePreview directly for the "draw a tappable region on
// the image" interaction — LINE's Imagemap Message is structurally the
// same idea as a Rich Menu (one image, rectangular tap regions), so this
// is the same editor, not a lookalike rebuild.
export function ImagemapEditor({
  block,
  disabled,
  onChange,
}: {
  block: ImagemapBlock;
  disabled?: boolean;
  onChange: (patch: Partial<ImagemapBlock>) => void;
}) {
  const t = useTranslations("broadcast");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageSelected(file: File) {
    const dimensions = await readImageDimensions(file);
    onChange({
      _file: file,
      _fileUrl: URL.createObjectURL(file),
      mediaPath: "",
      aspectRatio: dimensions ? dimensions.height / dimensions.width : block.aspectRatio,
    });
  }

  const previewAreas = block.areas.map((area) => ({
    label: area.label || t("areaUnlabeled"),
    bounds: { x: area.x, y: area.y, width: area.width, height: area.height },
  }));

  function handleAreaCreate(bounds: PercentBounds) {
    if (block.areas.length >= MAX_AREAS) return;
    onChange({
      areas: [
        ...block.areas,
        { id: crypto.randomUUID(), label: "", ...bounds, action: { type: "uri", value: "" } },
      ],
    });
  }

  function handleAreaChange(index: number, bounds: PercentBounds) {
    onChange({ areas: block.areas.map((a, i) => (i === index ? { ...a, ...bounds } : a)) });
  }

  function handleAreaDelete(index: number) {
    onChange({ areas: block.areas.filter((_, i) => i !== index) });
  }

  function updateArea(index: number, patch: Partial<ImagemapBlock["areas"][number]>) {
    onChange({ areas: block.areas.map((a, i) => (i === index ? { ...a, ...patch } : a)) });
  }

  function updateAreaAction(index: number, patch: Partial<ImagemapAction>) {
    updateArea(index, { action: { ...block.areas[index].action, ...patch } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t("imagemapAltTextLabel")}</Label>
        <Input
          value={block.altText}
          onChange={(e) => onChange({ altText: e.target.value })}
          placeholder={t("imagemapAltTextPlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center gap-2">
        {block._fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL or public proxy URL preview
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
            if (file) void handleImageSelected(file);
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
          {block._fileUrl ? t("attachImageChange") : t("attachImage")}
        </Button>
      </div>

      {block._fileUrl ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">{t("imagemapAreaHint")}</p>
          <RichMenuPhonePreview
            imageUrl={block._fileUrl}
            areas={previewAreas}
            editable
            onAreaCreate={handleAreaCreate}
            onAreaChange={handleAreaChange}
            onAreaDelete={handleAreaDelete}
          />
        </div>
      ) : null}

      {block.areas.length > 0 ? (
        <div className="flex flex-col gap-2">
          {block.areas.map((area, index) => (
            <div key={area.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_120px_2fr]">
              <Input
                value={area.label}
                onChange={(e) => updateArea(index, { label: e.target.value })}
                placeholder={t("imagemapAreaLabelPlaceholder", { index: index + 1 })}
                disabled={disabled}
              />
              <Select value={area.action.type} onValueChange={(v) => updateAreaAction(index, { type: (v ?? "uri") as ImagemapAction["type"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: ImagemapAction["type"]) => (v === "uri" ? t("actionUri") : t("actionMessage"))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uri">{t("actionUri")}</SelectItem>
                  <SelectItem value="message">{t("actionMessage")}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={area.action.value}
                onChange={(e) => updateAreaAction(index, { value: e.target.value })}
                placeholder={area.action.type === "uri" ? "https://" : (t("areaMessageValue") as string)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
