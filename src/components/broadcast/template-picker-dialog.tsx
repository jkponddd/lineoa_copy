"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Type, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { BroadcastTemplate } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const TEMPLATES: BroadcastTemplate[] = ["text", "image_text", "image_link"];

const TEMPLATE_ICON: Record<BroadcastTemplate, typeof Type> = {
  text: Type,
  image_text: ImageIcon,
  image_link: LinkIcon,
};

// A popup rather than an always-expanded row of three cards — mirrors
// LayoutPickerDialog's reasoning for the Rich Menu layout picker: a choice
// made once per broadcast, not something worth permanently eating vertical
// space in the composer.
export function TemplatePickerDialog({
  template,
  onSelect,
  disabled,
}: {
  template: BroadcastTemplate;
  onSelect: (template: BroadcastTemplate) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("broadcast");
  const [open, setOpen] = useState(false);

  const templateLabel: Record<BroadcastTemplate, string> = {
    text: t("templateText"),
    image_text: t("templateImageText"),
    image_link: t("templateImageLink"),
  };

  const CurrentIcon = TEMPLATE_ICON[template];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="outline" disabled={disabled} className="h-auto w-full justify-start gap-3 py-2" />}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border bg-muted">
          <CurrentIcon className="size-4 text-muted-foreground" />
        </span>
        <span className="flex flex-col items-start">
          <span className="text-sm font-medium">{templateLabel[template]}</span>
          <span className="text-xs text-muted-foreground">{t("templateChangeHint")}</span>
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("templateLabel")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((option) => {
            const Icon = TEMPLATE_ICON[option];
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border p-3 outline-none",
                  template === option ? "border-primary ring-1 ring-primary" : "border-border hover:bg-accent",
                )}
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-center text-xs text-muted-foreground">{templateLabel[option]}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
