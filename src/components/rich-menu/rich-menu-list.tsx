"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Star, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRichMenuAction, setDefaultRichMenuAction } from "@/app/[locale]/(app)/app/rich-menu/actions";
import { Link } from "@/i18n/navigation";
import type { RichMenuLayout, RichMenuStatus } from "@/lib/supabase/database.types";

export type RichMenuListItem = {
  id: string;
  name: string;
  layout: RichMenuLayout;
  status: RichMenuStatus;
  isDefault: boolean;
  channelId: string;
  channelName: string;
  imageUrl: string | null;
  errorMessage: string | null;
};

const STATUS_FILTERS: (RichMenuStatus | "all")[] = ["all", "published", "failed"];

export function RichMenuList({ items, channels }: { items: RichMenuListItem[]; channels: { id: string; display_name: string }[] }) {
  const t = useTranslations("richMenu");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RichMenuStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const statusLabel: Record<RichMenuStatus | "all", string> = {
    all: t("filterAllStatuses"),
    published: t("statusPublished"),
    failed: t("statusFailed"),
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (channelFilter !== "all" && item.channelId !== channelFilter) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
    rows = sortNewestFirst ? rows : [...rows].reverse();
    return rows;
  }, [items, search, statusFilter, channelFilter, sortNewestFirst]);

  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t("listEmpty")}</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="w-full sm:w-56" />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value ?? "all") as RichMenuStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{(value: RichMenuStatus | "all") => statusLabel[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>
              {(value: string) => (value === "all" ? t("filterAllChannels") : (channels.find((c) => c.id === value)?.display_name ?? value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllChannels")}</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => setSortNewestFirst((v) => !v)}>
          {sortNewestFirst ? t("sortNewestFirst") : t("sortOldestFirst")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("filterEmpty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableName")}</TableHead>
              <TableHead>{t("tableChannel")}</TableHead>
              <TableHead>{t("layoutLabel")}</TableHead>
              <TableHead>{t("tableStatus")}</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <RichMenuRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function RichMenuRow({ item }: { item: RichMenuListItem }) {
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
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, signed Storage URL
            <img src={item.imageUrl} alt={item.name} className="h-8 w-auto shrink-0 rounded border object-cover" />
          ) : null}
          <span className="truncate">{item.name}</span>
          {item.isDefault ? (
            <Badge className="shrink-0 gap-1">
              <Star className="size-3" />
              {t("defaultBadge")}
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{item.channelName}</TableCell>
      <TableCell className="text-muted-foreground">{item.layout === "custom" ? t("layoutCustom") : item.layout}</TableCell>
      <TableCell>
        {item.status === "failed" ? (
          <Badge variant="destructive" title={item.errorMessage ?? undefined}>
            {t("statusFailed")}
          </Badge>
        ) : (
          <Badge variant="outline">{t("statusPublished")}</Badge>
        )}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link
            href={`/app/rich-menu/new?copyFrom=${item.id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <Copy className="size-3.5" />
            {t("copyButton")}
          </Link>
          {item.status === "published" && !item.isDefault ? (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleSetDefault}>
              {pendingAction === "default" ? t("settingDefault") : t("setDefaultButton")}
            </Button>
          ) : null}
          <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
            {pendingAction === "delete" ? t("deleting") : t("deleteButton")}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
