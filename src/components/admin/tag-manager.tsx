"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TagBadge } from "@/components/tags/tag-badge";
import { createTagAction, deleteTagAction } from "@/app/[locale]/(admin)/admin/tags/actions";
import { TAG_COLORS } from "@/lib/tags/colors";
import { cn } from "@/lib/utils";

type Tag = { id: string; name: string; color: string };

export function TagManager({ organizationId, tags }: { organizationId: string; tags: Tag[] }) {
  const t = useTranslations("tags");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(TAG_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tags.filter((tag) => tag.name.toLowerCase().includes(q)) : tags;
  }, [tags, search]);

  function submitCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("nameRequired");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createTagAction(organizationId, trimmed, color);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setColor(TAG_COLORS[0]);
      setOpen(false);
    });
  }

  function handleDelete(tagId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setDeletingId(tagId);
    startTransition(async () => {
      await deleteTagAction(tagId);
      setDeletingId(null);
    });
  }

  const errorMessage = error === "nameRequired" ? t("nameRequired") : error === "duplicateName" ? t("duplicateName") : error;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button className="gap-2" />}>
            <Plus className="size-4" />
            {t("addButton")}
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{t("addTitle")}</SheetTitle>
              <SheetDescription>{t("addDescription")}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tag-name">{t("nameLabel")}</Label>
                <Input
                  id="tag-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("colorLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      disabled={pending}
                      aria-label={swatch}
                      onClick={() => setColor(swatch)}
                      className={cn(
                        "size-7 rounded-full border-2 outline-none",
                        color === swatch ? "border-foreground" : "border-transparent",
                      )}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </div>
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
            </div>
            <SheetFooter>
              <Button type="button" disabled={pending} onClick={submitCreate}>
                {t("addButton")}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {tags.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <TagIcon className="mx-auto mb-2 size-5" />
          {t("empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="w-full sm:w-56" />
          {filteredTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("filterEmpty")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-1 rounded-full border pl-1 pr-1">
                  <TagBadge name={tag.name} color={tag.color} className="border-none" />
                  <button
                    type="button"
                    disabled={pending && deletingId === tag.id}
                    onClick={() => handleDelete(tag.id)}
                    aria-label={t("deleteButton")}
                    className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
