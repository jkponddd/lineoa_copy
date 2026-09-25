"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createFlexComponent,
  createFlexBubble,
  MAX_CAROUSEL_BUBBLES,
  type FlexAction,
  type FlexBoxLayout,
  type FlexComponentType,
  type FlexTextAlign,
  type FlexTextSize,
  type FlexTextWeight,
  type FlexButtonStyle,
} from "@/lib/broadcast/blocks";
import type { EditableBlock, EditableFlexComponent, EditableFlexBubble } from "@/components/broadcast/editable-block";

type FlexBlock = Extract<EditableBlock, { type: "flex" }>;
type BoxComponent = Extract<EditableFlexComponent, { type: "box" }>;
type ImageComponent = Extract<EditableFlexComponent, { type: "image" }>;

const CHILD_TYPES: FlexComponentType[] = ["box", "text", "image", "button", "separator"];

// One or more cards (bubbles) — more than one becomes a swipeable
// carousel. A small tab strip selects which card is being edited; each
// card gets the same hero/body/footer box/component tree editor
// (BubbleEditor) that a single Flex message always had.
export function FlexEditor({ block, disabled, onChange }: { block: FlexBlock; disabled?: boolean; onChange: (patch: Partial<FlexBlock>) => void }) {
  const t = useTranslations("broadcast");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = Math.min(selectedIndex, block.bubbles.length - 1);

  function updateBubble(index: number, patch: Partial<EditableFlexBubble>) {
    const next = [...block.bubbles];
    next[index] = { ...next[index], ...patch };
    onChange({ bubbles: next });
  }

  function addBubble() {
    if (block.bubbles.length >= MAX_CAROUSEL_BUBBLES) return;
    onChange({ bubbles: [...block.bubbles, createFlexBubble() as EditableFlexBubble] });
    setSelectedIndex(block.bubbles.length);
  }

  function removeBubble(index: number) {
    if (block.bubbles.length <= 1) return;
    const next = block.bubbles.filter((_, i) => i !== index);
    onChange({ bubbles: next });
    setSelectedIndex((i) => Math.min(i, next.length - 1));
  }

  function moveBubble(from: number, to: number) {
    if (to < 0 || to >= block.bubbles.length) return;
    const next = [...block.bubbles];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ bubbles: next });
    setSelectedIndex(to);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t("flexAltTextLabel")}</Label>
        <Input value={block.altText} onChange={(e) => onChange({ altText: e.target.value })} placeholder={t("flexAltTextPlaceholder")} disabled={disabled} />
      </div>

      {block.bubbles.length > 1 ? <p className="text-xs text-muted-foreground">{t("flexCarouselHint")}</p> : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {block.bubbles.map((bubble, index) => (
          <Button
            key={bubble.id}
            type="button"
            size="sm"
            variant={index === activeIndex ? "default" : "outline"}
            disabled={disabled}
            onClick={() => setSelectedIndex(index)}
          >
            {t("flexCardLabel", { index: index + 1 })}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" disabled={disabled || block.bubbles.length >= MAX_CAROUSEL_BUBBLES} className="gap-1" onClick={addBubble}>
          <Plus className="size-3.5" />
          {t("flexAddCard")}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 text-muted-foreground">
          <button type="button" disabled={disabled || activeIndex === 0} onClick={() => moveBubble(activeIndex, activeIndex - 1)} aria-label={t("blockMoveUp")}>
            <ChevronLeft className="size-4 disabled:opacity-30" />
          </button>
          <button
            type="button"
            disabled={disabled || activeIndex === block.bubbles.length - 1}
            onClick={() => moveBubble(activeIndex, activeIndex + 1)}
            aria-label={t("blockMoveDown")}
          >
            <ChevronRight className="size-4 disabled:opacity-30" />
          </button>
        </div>
        {block.bubbles.length > 1 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => removeBubble(activeIndex)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            {t("flexRemoveCard")}
          </button>
        ) : null}
      </div>

      <BubbleEditor bubble={block.bubbles[activeIndex]} disabled={disabled} onChange={(patch) => updateBubble(activeIndex, patch)} />
    </div>
  );
}

function BubbleEditor({
  bubble,
  disabled,
  onChange,
}: {
  bubble: EditableFlexBubble;
  disabled?: boolean;
  onChange: (patch: Partial<EditableFlexBubble>) => void;
}) {
  const t = useTranslations("broadcast");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-md border p-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t("flexHeroLabel")}</Label>
          {bubble.hero ? (
            <button type="button" disabled={disabled} onClick={() => onChange({ hero: null })} className="text-muted-foreground hover:text-destructive">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        {bubble.hero ? (
          <FlexImageFields component={bubble.hero} disabled={disabled} onChange={(patch) => onChange({ hero: { ...bubble.hero!, ...patch } })} />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-fit gap-1.5"
            onClick={() => onChange({ hero: createFlexComponent("image") as Extract<EditableFlexComponent, { type: "image" }> })}
          >
            <Plus className="size-3.5" />
            {t("flexAddHeroImage")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-md border p-2">
        <Label className="text-xs">{t("flexBodyLabel")}</Label>
        <BoxChildrenEditor box={bubble.body} disabled={disabled} onChange={(patch) => onChange({ body: { ...bubble.body, ...patch } })} />
      </div>

      <div className="flex flex-col gap-2 rounded-md border p-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t("flexFooterLabel")}</Label>
          {bubble.footer ? (
            <button type="button" disabled={disabled} onClick={() => onChange({ footer: null })} className="text-muted-foreground hover:text-destructive">
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        {bubble.footer ? (
          <BoxChildrenEditor box={bubble.footer} disabled={disabled} onChange={(patch) => onChange({ footer: { ...bubble.footer!, ...patch } })} />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-fit gap-1.5"
            onClick={() => onChange({ footer: createFlexComponent("box") as Extract<EditableFlexComponent, { type: "box" }> })}
          >
            <Plus className="size-3.5" />
            {t("flexAddFooter")}
          </Button>
        )}
      </div>
    </div>
  );
}

function BoxChildrenEditor({ box, disabled, onChange }: { box: BoxComponent; disabled?: boolean; onChange: (patch: Partial<BoxComponent>) => void }) {
  const t = useTranslations("broadcast");

  const layoutLabel: Record<FlexBoxLayout, string> = {
    horizontal: t("flexLayoutHorizontal"),
    vertical: t("flexLayoutVertical"),
    baseline: t("flexLayoutBaseline"),
  };
  const childTypeLabel: Record<FlexComponentType, string> = {
    box: t("flexComponentBox"),
    text: t("blockText"),
    image: t("blockImage"),
    button: t("blockButton"),
    separator: t("flexComponentSeparator"),
  };

  function move(from: number, to: number) {
    if (to < 0 || to >= box.children.length || from === to) return;
    const next = [...box.children];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ children: next });
  }

  function updateChild(index: number, patch: Partial<EditableFlexComponent>) {
    const next = [...box.children];
    next[index] = { ...next[index], ...patch } as EditableFlexComponent;
    onChange({ children: next });
  }

  function removeChild(index: number) {
    onChange({ children: box.children.filter((_, i) => i !== index) });
  }

  function addChild(type: FlexComponentType) {
    onChange({ children: [...box.children, createFlexComponent(type) as EditableFlexComponent] });
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={box.layout} onValueChange={(v) => onChange({ layout: (v ?? "vertical") as FlexBoxLayout })}>
        <SelectTrigger className="w-full sm:w-56" disabled={disabled}>
          <SelectValue>{(v: FlexBoxLayout) => layoutLabel[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="vertical">{layoutLabel.vertical}</SelectItem>
          <SelectItem value="horizontal">{layoutLabel.horizontal}</SelectItem>
          <SelectItem value="baseline">{layoutLabel.baseline}</SelectItem>
        </SelectContent>
      </Select>

      {box.children.map((child, index) => (
        <div key={child.id} className="flex gap-2 rounded-md border bg-card p-2">
          <div className="flex flex-col items-center gap-1 pt-1 text-muted-foreground">
            <button type="button" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label={t("blockMoveUp")}>
              <ChevronUp className="size-3.5 disabled:opacity-30" />
            </button>
            <button
              type="button"
              disabled={disabled || index === box.children.length - 1}
              onClick={() => move(index, index + 1)}
              aria-label={t("blockMoveDown")}
            >
              <ChevronDown className="size-3.5 disabled:opacity-30" />
            </button>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{childTypeLabel[child.type]}</span>
              <button type="button" disabled={disabled} onClick={() => removeChild(index)} aria-label={t("blockRemove")} className="text-muted-foreground hover:text-destructive">
                <X className="size-4" />
              </button>
            </div>
            <FlexComponentFields component={child} disabled={disabled} onChange={(patch) => updateChild(index, patch)} />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5">
        {CHILD_TYPES.map((type) => (
          <Button key={type} type="button" variant="outline" size="sm" disabled={disabled} className="gap-1" onClick={() => addChild(type)}>
            <Plus className="size-3.5" />
            {childTypeLabel[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function FlexComponentFields({
  component,
  disabled,
  onChange,
}: {
  component: EditableFlexComponent;
  disabled?: boolean;
  onChange: (patch: Partial<EditableFlexComponent>) => void;
}) {
  const t = useTranslations("broadcast");

  if (component.type === "box") {
    return <BoxChildrenEditor box={component} disabled={disabled} onChange={onChange} />;
  }

  if (component.type === "text") {
    const sizeLabel: Record<FlexTextSize, string> = { xs: "XS", sm: "S", md: "M", lg: "L", xl: "XL" };
    const weightLabel: Record<FlexTextWeight, string> = { regular: t("flexWeightRegular"), bold: t("flexWeightBold") };
    const alignLabel: Record<FlexTextAlign, string> = { start: t("flexAlignStart"), center: t("flexAlignCenter"), end: t("flexAlignEnd") };
    return (
      <div className="flex flex-col gap-2">
        <Textarea value={component.text} onChange={(e) => onChange({ text: e.target.value })} placeholder={t("messagePlaceholder")} disabled={disabled} rows={2} />
        <div className="grid grid-cols-3 gap-2">
          <Select value={component.size} onValueChange={(v) => onChange({ size: (v ?? "md") as FlexTextSize })}>
            <SelectTrigger disabled={disabled}>
              <SelectValue>{(v: FlexTextSize) => sizeLabel[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sizeLabel) as FlexTextSize[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {sizeLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={component.weight} onValueChange={(v) => onChange({ weight: (v ?? "regular") as FlexTextWeight })}>
            <SelectTrigger disabled={disabled}>
              <SelectValue>{(v: FlexTextWeight) => weightLabel[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">{weightLabel.regular}</SelectItem>
              <SelectItem value="bold">{weightLabel.bold}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={component.align} onValueChange={(v) => onChange({ align: (v ?? "start") as FlexTextAlign })}>
            <SelectTrigger disabled={disabled}>
              <SelectValue>{(v: FlexTextAlign) => alignLabel[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">{alignLabel.start}</SelectItem>
              <SelectItem value="center">{alignLabel.center}</SelectItem>
              <SelectItem value="end">{alignLabel.end}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (component.type === "image") {
    return <FlexImageFields component={component} disabled={disabled} onChange={onChange} />;
  }

  if (component.type === "button") {
    const styleLabel: Record<FlexButtonStyle, string> = { primary: t("flexStylePrimary"), secondary: t("flexStyleSecondary"), link: t("flexStyleLink") };
    return (
      <div className="flex flex-col gap-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={component.action.label}
            onChange={(e) => onChange({ action: { ...component.action, label: e.target.value } })}
            placeholder={t("linkLabelPlaceholder")}
            disabled={disabled}
          />
          <Select value={component.style} onValueChange={(v) => onChange({ style: (v ?? "primary") as FlexButtonStyle })}>
            <SelectTrigger disabled={disabled}>
              <SelectValue>{(v: FlexButtonStyle) => styleLabel[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">{styleLabel.primary}</SelectItem>
              <SelectItem value="secondary">{styleLabel.secondary}</SelectItem>
              <SelectItem value="link">{styleLabel.link}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FlexActionValueField action={component.action} disabled={disabled} onChange={(patch) => onChange({ action: { ...component.action, ...patch } })} />
      </div>
    );
  }

  return null;
}

function FlexImageFields({ component, disabled, onChange }: { component: ImageComponent; disabled?: boolean; onChange: (patch: Partial<ImageComponent>) => void }) {
  const t = useTranslations("broadcast");
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {component._fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL or signed Storage URL preview
          <img src={component._fileUrl} alt="" className="h-14 w-auto rounded border object-cover" />
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
          {component._fileUrl ? t("attachImageChange") : t("attachImage")}
        </Button>
      </div>
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={Boolean(component.action)}
          disabled={disabled}
          onChange={(e) => onChange({ action: e.target.checked ? { type: "uri", label: "", value: "" } : null })}
          className="size-3.5 rounded border-input"
        />
        {t("flexImageActionToggle")}
      </label>
      {component.action ? <FlexActionValueField action={component.action} disabled={disabled} onChange={(patch) => onChange({ action: { ...component.action!, ...patch } })} /> : null}
    </div>
  );
}

function FlexActionValueField({ action, disabled, onChange }: { action: FlexAction; disabled?: boolean; onChange: (patch: Partial<FlexAction>) => void }) {
  const t = useTranslations("broadcast");
  return (
    <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
      <Select value={action.type} onValueChange={(v) => onChange({ type: (v ?? "uri") as FlexAction["type"] })}>
        <SelectTrigger disabled={disabled}>
          <SelectValue>{(v: FlexAction["type"]) => (v === "uri" ? t("actionUri") : t("actionMessage"))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="uri">{t("actionUri")}</SelectItem>
          <SelectItem value="message">{t("actionMessage")}</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={action.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={action.type === "uri" ? "https://" : (t("areaMessageValue") as string)}
        disabled={disabled}
      />
    </div>
  );
}
