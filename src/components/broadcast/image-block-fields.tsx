"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichMenuPhonePreview } from "@/components/rich-menu/rich-menu-phone-preview";
import type { PercentBounds } from "@/lib/line/rich-menu-layouts";
import type { FlexAction, ImageBlockMode, ImagemapAction } from "@/lib/broadcast/blocks";
import type { EditableBlock } from "@/components/broadcast/editable-block";

type ImageBlock = Extract<EditableBlock, { type: "image" }>;

const MAX_AREAS = 20;

// One image block, one editor — the mode selector (plain / one action /
// many tap regions) decides which extra fields show below the shared
// image attach control, rather than three separate block types the user
// would have to pick between up front. The "regions" mode reuses
// RichMenuPhonePreview directly for drawing tap areas, same as before.
export function ImageBlockFields({
  block,
  disabled,
  onChange,
}: {
  block: ImageBlock;
  disabled?: boolean;
  onChange: (patch: Partial<ImageBlock>) => void;
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

  function handleModeChange(mode: ImageBlockMode) {
    if (mode === "action" && !block.action) {
      onChange({ mode, action: { type: "uri", label: "", value: "" } });
      return;
    }
    onChange({ mode });
  }

  function updateAction(patch: Partial<FlexAction>) {
    onChange({ action: { type: "uri", label: "", value: "", ...block.action, ...patch } });
  }

  const modeLabel: Record<ImageBlockMode, string> = {
    plain: t("imageModePlain"),
    action: t("imageModeAction"),
    regions: t("imageModeRegions"),
  };

  const previewAreas = block.areas.map((area) => ({
    label: area.label || t("areaUnlabeled"),
    bounds: { x: area.x, y: area.y, width: area.width, height: area.height },
  }));

  function handleAreaCreate(bounds: PercentBounds) {
    if (block.areas.length >= MAX_AREAS) return;
    onChange({ areas: [...block.areas, { id: crypto.randomUUID(), label: "", ...bounds, action: { type: "uri", value: "" } }] });
  }

  function handleAreaChange(index: number, bounds: PercentBounds) {
    onChange({ areas: block.areas.map((a, i) => (i === index ? { ...a, ...bounds } : a)) });
  }

  function handleAreaDelete(index: number) {
    onChange({ areas: block.areas.filter((_, i) => i !== index) });
  }

  function updateArea(index: number, patch: Partial<ImageBlock["areas"][number]>) {
    onChange({ areas: block.areas.map((a, i) => (i === index ? { ...a, ...patch } : a)) });
  }

  function updateAreaAction(index: number, patch: Partial<ImagemapAction>) {
    updateArea(index, { action: { ...block.areas[index].action, ...patch } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {block._fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL, signed, or public proxy URL preview
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

      <div className="flex flex-wrap gap-1.5">
        {(["plain", "action", "regions"] as const).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={block.mode === mode ? "default" : "outline"}
            disabled={disabled}
            onClick={() => handleModeChange(mode)}
          >
            {modeLabel[mode]}
          </Button>
        ))}
      </div>

      {block.mode === "action" ? (
        <div className="flex flex-col gap-2 rounded-md border p-2">
          <Input
            value={block.altText}
            onChange={(e) => onChange({ altText: e.target.value })}
            placeholder={t("imageCaptionPlaceholder")}
            disabled={disabled}
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
            <Input
              value={block.action?.label ?? ""}
              onChange={(e) => updateAction({ label: e.target.value })}
              placeholder={t("linkLabelPlaceholder")}
              disabled={disabled}
            />
            <Select value={block.action?.type ?? "uri"} onValueChange={(v) => updateAction({ type: (v ?? "uri") as FlexAction["type"] })}>
              <SelectTrigger disabled={disabled}>
                <SelectValue>{(v: FlexAction["type"]) => (v === "uri" ? t("actionUri") : t("actionMessage"))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uri">{t("actionUri")}</SelectItem>
                <SelectItem value="message">{t("actionMessage")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            value={block.action?.value ?? ""}
            onChange={(e) => updateAction({ value: e.target.value })}
            placeholder={block.action?.type === "message" ? (t("areaMessageValue") as string) : "https://"}
            disabled={disabled}
          />
        </div>
      ) : null}

      {block.mode === "regions" ? (
        <div className="flex flex-col gap-3 rounded-md border p-2">
          <Input
            value={block.altText}
            onChange={(e) => onChange({ altText: e.target.value })}
            placeholder={t("imagemapAltTextPlaceholder")}
            disabled={disabled}
          />

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
                <div key={area.id} className="grid gap-2 sm:grid-cols-[1fr_120px_2fr]">
                  <Input
                    value={area.label}
                    onChange={(e) => updateArea(index, { label: e.target.value })}
                    placeholder={t("imagemapAreaLabelPlaceholder", { index: index + 1 })}
                    disabled={disabled}
                  />
                  <Select value={area.action.type} onValueChange={(v) => updateAreaAction(index, { type: (v ?? "uri") as ImagemapAction["type"] })}>
                    <SelectTrigger disabled={disabled}>
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
