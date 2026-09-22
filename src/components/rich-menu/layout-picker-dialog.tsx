"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LayoutPreview } from "@/components/rich-menu/layout-preview";
import { RICH_MENU_TEMPLATE_LAYOUTS } from "@/lib/line/rich-menu-layouts";
import type { RichMenuLayout } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

// A popup rather than an always-expanded grid — six options inline ate a
// lot of vertical space for a choice made once per rich menu, not
// something the user needs to keep glancing at while filling in the rest
// of the form.
export function LayoutPickerDialog({
  layout,
  onSelect,
}: {
  layout: RichMenuLayout;
  onSelect: (layout: RichMenuLayout) => void;
}) {
  const t = useTranslations("richMenu");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="h-auto w-full justify-start gap-3 py-2" />
        }
      >
        <span className="w-10 shrink-0">
          {layout === "custom" ? (
            <div className="flex aspect-2500/1686 w-full items-center justify-center rounded-sm border border-dashed border-border">
              <Pencil className="size-3.5 text-muted-foreground" />
            </div>
          ) : (
            <LayoutPreview layout={layout} />
          )}
        </span>
        <span className="flex flex-col items-start">
          <span className="text-sm font-medium">{layout === "custom" ? t("layoutCustom") : layout}</span>
          <span className="text-xs text-muted-foreground">{t("layoutChangeHint")}</span>
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("layoutLabel")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {RICH_MENU_TEMPLATE_LAYOUTS.map((option) => (
            <LayoutOption
              key={option}
              selected={layout === option}
              label={option}
              onClick={() => {
                onSelect(option);
                setOpen(false);
              }}
            >
              <LayoutPreview layout={option} />
            </LayoutOption>
          ))}
          <LayoutOption
            selected={layout === "custom"}
            label={t("layoutCustom")}
            onClick={() => {
              onSelect("custom");
              setOpen(false);
            }}
          >
            <div className="flex aspect-2500/1686 w-full items-center justify-center rounded-sm border border-dashed border-border">
              <Pencil className="size-4 text-muted-foreground" />
            </div>
          </LayoutOption>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LayoutOption({
  selected,
  label,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border p-2 outline-none",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:bg-accent",
      )}
    >
      {children}
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}
