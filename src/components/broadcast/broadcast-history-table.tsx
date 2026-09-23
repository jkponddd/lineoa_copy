"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CancelBroadcastButton } from "@/components/broadcast/cancel-broadcast-button";
import { DeleteDraftButton } from "@/components/broadcast/delete-draft-button";
import { Link } from "@/i18n/navigation";
import { blocksSummaryText } from "@/lib/broadcast/blocks";
import type { BroadcastAudience, BroadcastBlock, BroadcastStatus } from "@/lib/supabase/database.types";

export type BroadcastHistoryRow = {
  id: string;
  blocks: BroadcastBlock[];
  audience: BroadcastAudience;
  scheduled_at: string | null;
  status: BroadcastStatus;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
  line_channel_id: string;
};

const STATUS_BADGE_VARIANT: Record<BroadcastStatus, "default" | "destructive" | "outline" | "secondary"> = {
  draft: "secondary",
  scheduled: "outline",
  sending: "secondary",
  sent: "default",
  failed: "destructive",
};

const STATUS_FILTERS: (BroadcastStatus | "all")[] = ["all", "draft", "scheduled", "sending", "sent", "failed"];

export function BroadcastHistoryTable({
  history,
  channels,
  channelNameById,
  memberById,
  mediaUrlByPath,
}: {
  history: BroadcastHistoryRow[];
  channels: { id: string; display_name: string }[];
  channelNameById: Map<string, string>;
  memberById: Map<string, { full_name: string | null; email: string }>;
  mediaUrlByPath: Map<string, string>;
}) {
  const t = useTranslations("broadcast");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BroadcastStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const statusLabel: Record<BroadcastStatus | "all", string> = {
    all: t("filterAllStatuses"),
    draft: t("statusDraft"),
    scheduled: t("statusScheduled"),
    sending: t("statusSending"),
    sent: t("statusSent"),
    failed: t("statusFailed"),
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = history.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (channelFilter !== "all" && row.line_channel_id !== channelFilter) return false;
      if (q && !blocksSummaryText(row.blocks).toLowerCase().includes(q)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortNewestFirst ? -diff : diff;
    });
    return rows;
  }, [history, search, statusFilter, channelFilter, sortNewestFirst]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full sm:w-56"
        />
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value ?? "all") as BroadcastStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue>{(value: BroadcastStatus | "all") => statusLabel[value]}</SelectValue>
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
            <SelectValue>{(value: string) => (value === "all" ? t("filterAllChannels") : (channelNameById.get(value) ?? value))}</SelectValue>
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
        <p className="text-sm text-muted-foreground">{history.length === 0 ? t("historyEmpty") : t("filterEmpty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableTime")}</TableHead>
              <TableHead>{t("tableChannel")}</TableHead>
              <TableHead>{t("tableAudience")}</TableHead>
              <TableHead>{t("tableMessage")}</TableHead>
              <TableHead>{t("tableSentBy")}</TableHead>
              <TableHead>{t("tableStatus")}</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((broadcast) => {
              const sender = broadcast.sent_by ? memberById.get(broadcast.sent_by) : null;
              const firstImage = broadcast.blocks.find((b) => b.type === "image" || b.type === "video");
              const imageUrl =
                firstImage?.type === "image"
                  ? mediaUrlByPath.get(firstImage.mediaPath)
                  : firstImage?.type === "video"
                    ? mediaUrlByPath.get(firstImage.previewMediaPath)
                    : null;
              const isScheduled = broadcast.status === "scheduled";
              const isDraft = broadcast.status === "draft";

              return (
                <TableRow key={broadcast.id}>
                  <TableCell className="text-muted-foreground">
                    {isScheduled && broadcast.scheduled_at ? (
                      <div className="flex flex-col">
                        <span className="text-xs">{t("scheduledForLabel")}</span>
                        <span>{new Date(broadcast.scheduled_at).toLocaleString()}</span>
                      </div>
                    ) : (
                      new Date(broadcast.created_at).toLocaleString()
                    )}
                  </TableCell>
                  <TableCell>{channelNameById.get(broadcast.line_channel_id) ?? "—"}</TableCell>
                  <TableCell>{broadcast.audience === "all" ? t("audienceAll") : t("audienceConversations")}</TableCell>
                  <TableCell className="max-w-64">
                    <div className="flex items-center gap-2">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- private, signed Storage URL
                        <img src={imageUrl} alt={t("imagePreviewAlt")} className="size-8 shrink-0 rounded object-cover" />
                      ) : null}
                      <span className="truncate">{blocksSummaryText(broadcast.blocks) || t("imageOnlyLabel")}</span>
                    </div>
                  </TableCell>
                  <TableCell>{sender ? sender.full_name || sender.email : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[broadcast.status]} title={broadcast.error_message ?? undefined}>
                      {t(`status${capitalize(broadcast.status)}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isDraft ? (
                        <>
                          <Link
                            href={`/app/broadcast/new?draft=${broadcast.id}`}
                            className="text-sm text-primary underline-offset-4 hover:underline"
                          >
                            {t("editDraftButton")}
                          </Link>
                          <DeleteDraftButton broadcastId={broadcast.id} />
                        </>
                      ) : null}
                      <Link
                        href={`/app/broadcast/new?copyFrom=${broadcast.id}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        <Copy className="size-3.5" />
                        {t("copyButton")}
                      </Link>
                      {isScheduled ? <CancelBroadcastButton broadcastId={broadcast.id} /> : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
