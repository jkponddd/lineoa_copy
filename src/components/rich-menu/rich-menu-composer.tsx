"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutPickerDialog } from "@/components/rich-menu/layout-picker-dialog";
import { RichMenuPhonePreview } from "@/components/rich-menu/rich-menu-phone-preview";
import { createClient } from "@/lib/supabase/client";
import { createRichMenuAction } from "@/app/[locale]/(app)/app/rich-menu/actions";
import {
  computeTemplateAreaBoundsPercent,
  RICH_MENU_IMAGE_HEIGHT,
  RICH_MENU_IMAGE_WIDTH,
  type PercentBounds,
  type TemplateRichMenuLayout,
} from "@/lib/line/rich-menu-layouts";
import type { RichMenuActionType, RichMenuAreaData, RichMenuLayout } from "@/lib/supabase/database.types";

type Channel = { id: string; display_name: string };
type SwitchTarget = { id: string; name: string };

export type AreaInput = { label: string; action_type: RichMenuActionType; action_value: string; bounds: PercentBounds };

function templateAreas(layout: TemplateRichMenuLayout): AreaInput[] {
  return computeTemplateAreaBoundsPercent(layout).map((bounds) => ({
    label: "",
    action_type: "message" as const,
    action_value: "",
    bounds,
  }));
}

export type RichMenuInitialValues = {
  name: string;
  layout: RichMenuLayout;
  areas: AreaInput[];
};

export function RichMenuComposer({
  channels,
  organizationId,
  switchTargetsByChannel,
  initialValues,
}: {
  channels: Channel[];
  organizationId: string;
  switchTargetsByChannel: Record<string, SwitchTarget[]>;
  initialValues?: RichMenuInitialValues;
}) {
  const t = useTranslations("richMenu");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [layout, setLayout] = useState<RichMenuLayout>(initialValues?.layout ?? "2x2");
  const [areas, setAreas] = useState<AreaInput[]>(initialValues?.areas ?? templateAreas("2x2"));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const channelById = new Map(channels.map((c) => [c.id, c.display_name]));
  const switchTargets = switchTargetsByChannel[channelId] ?? [];

  function handleLayoutChange(nextLayout: RichMenuLayout) {
    setLayout(nextLayout);
    setAreas(nextLayout === "custom" ? [] : templateAreas(nextLayout as TemplateRichMenuLayout));
  }

  function handleAreaFieldChange(index: number, patch: Partial<Pick<AreaInput, "label" | "action_type" | "action_value">>) {
    setAreas((prev) => prev.map((area, i) => (i === index ? { ...area, ...patch } : area)));
  }

  function handleAreaBoundsChange(index: number, bounds: PercentBounds) {
    setAreas((prev) => prev.map((area, i) => (i === index ? { ...area, bounds } : area)));
  }

  function handleAreaCreate(bounds: PercentBounds) {
    if (areas.length >= 20) return; // LINE's own per-menu area limit
    setAreas((prev) => [...prev, { label: "", action_type: "message", action_value: "", bounds }]);
  }

  function handleAreaDelete(index: number) {
    setAreas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleImageSelected(file: File) {
    setError(null);
    const dimensions = await readImageDimensions(file);
    if (!dimensions || dimensions.width !== RICH_MENU_IMAGE_WIDTH || dimensions.height !== RICH_MENU_IMAGE_HEIGHT) {
      setError(t("imageDimensionError", { width: RICH_MENU_IMAGE_WIDTH, height: RICH_MENU_IMAGE_HEIGHT }));
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function submit() {
    setError(null);
    setSuccess(false);

    if (!channelId || !name.trim() || !imageFile || areas.length === 0) {
      setError(t("formIncomplete"));
      return;
    }
    if (areas.some((a) => !a.label.trim() || !a.action_value.trim())) {
      setError(t("formIncomplete"));
      return;
    }

    startTransition(async () => {
      const extension = imageFile.name.split(".").pop() || "png";
      const path = `${organizationId}/${crypto.randomUUID()}.${extension}`;
      const contentType = imageFile.type || "image/png";

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("rich-menu-images")
        .upload(path, imageFile, { contentType });

      if (uploadError) {
        setError(t("createError"));
        return;
      }

      const result = await createRichMenuAction(
        channelId,
        name.trim(),
        layout,
        path,
        contentType,
        areas as RichMenuAreaData[],
      );

      if (result.error) {
        setError(t("createError"));
        return;
      }

      setSuccess(true);
      setName("");
      setImageFile(null);
      setImagePreview(null);
      setAreas(layout === "custom" ? [] : templateAreas(layout as TemplateRichMenuLayout));
    });
  }

  const previewAreas = areas.map((a) => ({ label: a.label || t("areaUnlabeled"), bounds: a.bounds }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("channelLabel")}</Label>
            <Select value={channelId} onValueChange={(value) => setChannelId(value ?? "")} disabled={pending}>
              <SelectTrigger className="w-full">
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
            <Label htmlFor="rich-menu-name">{t("nameLabel")}</Label>
            <Input
              id="rich-menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("layoutLabel")}</Label>
          <LayoutPickerDialog layout={layout} onSelect={handleLayoutChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("imageLabel")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("imageHint", { width: RICH_MENU_IMAGE_WIDTH, height: RICH_MENU_IMAGE_HEIGHT })}
          </p>
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg"
              id="rich-menu-image"
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
              size="sm"
              disabled={pending}
              className="gap-1.5"
              onClick={() => document.getElementById("rich-menu-image")?.click()}
            >
              <Upload className="size-4" />
              {t("imageUploadButton")}
            </Button>
          </div>
        </div>

        {layout === "custom" ? (
          <p className="text-xs text-muted-foreground">{t("customLayoutHint")}</p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Label>{t("areasLabel")}</Label>
          {areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {layout === "custom" ? t("customLayoutEmpty") : t("formIncomplete")}
            </p>
          ) : null}
          {areas.map((area, index) => (
            <div key={index} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_140px_2fr]">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`area-label-${index}`} className="text-xs font-normal text-muted-foreground">
                  {t("areaLabelField", { index: index + 1 })}
                </Label>
                <Input
                  id={`area-label-${index}`}
                  value={area.label}
                  onChange={(e) => handleAreaFieldChange(index, { label: e.target.value })}
                  disabled={pending}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs font-normal text-muted-foreground">{t("areaActionType")}</Label>
                <Select
                  value={area.action_type}
                  onValueChange={(value) =>
                    handleAreaFieldChange(index, { action_type: (value ?? "message") as RichMenuActionType, action_value: "" })
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: RichMenuActionType) => actionTypeLabel(value, t)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">{t("actionMessage")}</SelectItem>
                    <SelectItem value="uri">{t("actionUri")}</SelectItem>
                    <SelectItem value="richmenuswitch">{t("actionSwitch")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`area-value-${index}`} className="text-xs font-normal text-muted-foreground">
                  {area.action_type === "message"
                    ? t("areaMessageValue")
                    : area.action_type === "uri"
                      ? t("areaUriValue")
                      : t("areaSwitchTarget")}
                </Label>
                {area.action_type === "richmenuswitch" ? (
                  <Select
                    value={area.action_value}
                    onValueChange={(value) => handleAreaFieldChange(index, { action_value: value ?? "" })}
                    disabled={pending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) => switchTargets.find((m) => m.id === value)?.name ?? t("areaSwitchTargetPlaceholder")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {switchTargets.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("noSwitchTargets")}</div>
                      ) : (
                        switchTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`area-value-${index}`}
                    value={area.action_value}
                    onChange={(e) => handleAreaFieldChange(index, { action_value: e.target.value })}
                    placeholder={area.action_type === "uri" ? "https://" : undefined}
                    disabled={pending}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("createSuccess")}</p> : null}

        <div>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? t("creating") : t("createButton")}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-center text-xs text-muted-foreground">{t("previewTitle")}</p>
        <RichMenuPhonePreview
          imageUrl={imagePreview}
          areas={previewAreas}
          editable={layout === "custom"}
          onAreaChange={handleAreaBoundsChange}
          onAreaCreate={handleAreaCreate}
          onAreaDelete={handleAreaDelete}
        />
      </div>
    </div>
  );
}

function actionTypeLabel(value: RichMenuActionType, t: ReturnType<typeof useTranslations>): string {
  if (value === "message") return t("actionMessage");
  if (value === "uri") return t("actionUri");
  return t("actionSwitch");
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
