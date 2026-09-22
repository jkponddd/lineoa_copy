"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutPreview } from "@/components/rich-menu/layout-preview";
import { deleteRichMenuAction, setDefaultRichMenuAction } from "@/app/[locale]/(app)/app/rich-menu/actions";
import type { RichMenuLayout, RichMenuStatus } from "@/lib/supabase/database.types";

export type RichMenuListItem = {
  id: string;
  name: string;
  layout: RichMenuLayout;
  status: RichMenuStatus;
  isDefault: boolean;
  channelName: string;
  imageUrl: string | null;
  errorMessage: string | null;
};

export function RichMenuList({ items }: { items: RichMenuListItem[] }) {
  const t = useTranslations("richMenu");

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t("listEmpty")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <RichMenuCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function RichMenuCard({ item }: { item: RichMenuListItem }) {
  const t = useTranslations("richMenu");
  const [pendingAction, setPendingAction] = useState<"default" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSetDefault() {
    setError(null);
    setPendingAction("default");
    startTransition(async () => {
      const result = await setDefaultRichMenuAction(item.id);
      if (result.error) setError(t("actionError"));
      setPendingAction(null);
    });
  }

  function handleDelete() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setError(null);
    setPendingAction("delete");
    startTransition(async () => {
      const result = await deleteRichMenuAction(item.id);
      if (result.error) setError(t("actionError"));
      setPendingAction(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{item.name}</CardTitle>
          {item.isDefault ? (
            <Badge className="shrink-0 gap-1">
              <Star className="size-3" />
              {t("defaultBadge")}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, signed Storage URL
          <img src={item.imageUrl} alt={item.name} className="w-full rounded-md border object-cover" />
        ) : (
          <LayoutPreview layout={item.layout} />
        )}

        <p className="text-xs text-muted-foreground">{item.channelName}</p>

        {item.status === "failed" ? (
          <Badge variant="destructive" className="w-fit" title={item.errorMessage ?? undefined}>
            {t("statusFailed")}
          </Badge>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {item.status === "published" ? (
          <div className="flex gap-2">
            {!item.isDefault ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={handleSetDefault}
              >
                {pendingAction === "default" ? t("settingDefault") : t("setDefaultButton")}
              </Button>
            ) : null}
            <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
              {pendingAction === "delete" ? t("deleting") : t("deleteButton")}
            </Button>
          </div>
        ) : (
          <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
            {pendingAction === "delete" ? t("deleting") : t("deleteButton")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
