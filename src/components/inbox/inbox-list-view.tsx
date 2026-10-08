"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagBadge } from "@/components/tags/tag-badge";
import { cn } from "@/lib/utils";
import type { ConversationStatus } from "@/lib/supabase/database.types";

type ConversationRow = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  assigned_to: string | null;
  last_message_at: string;
  status: ConversationStatus;
  tagIds: string[];
};

type PreviewRow = { conversation_id: string; type: "text" | "image" | "sticker" | "file"; content: string | null };
type Member = { user_id: string; full_name: string | null; email: string };
type Tag = { id: string; name: string; color: string };

const ALL = "all";

export function InboxListView({
  rows,
  previewByConversation,
  members,
  tags,
  currentUserId,
}: {
  rows: ConversationRow[];
  previewByConversation: Record<string, PreviewRow>;
  members: Member[];
  tags: Tag[];
  currentUserId: string;
}) {
  const t = useTranslations("inbox");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [tagFilter, setTagFilter] = useState<string>(ALL);

  const memberById = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);
  const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((conversation) => {
      if (statusFilter !== ALL && conversation.status !== statusFilter) return false;
      if (assigneeFilter === "unassigned" && conversation.assigned_to) return false;
      if (assigneeFilter === "me" && conversation.assigned_to !== currentUserId) return false;
      if (assigneeFilter !== ALL && assigneeFilter !== "unassigned" && assigneeFilter !== "me" && conversation.assigned_to !== assigneeFilter) {
        return false;
      }
      if (tagFilter !== ALL && !conversation.tagIds.includes(tagFilter)) return false;
      if (q) {
        const name = (conversation.display_name || t("unknownUser")).toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, assigneeFilter, tagFilter, currentUserId, t]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} className="w-full sm:w-52" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? ALL)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue>{(v: string) => (v === ALL ? t("filterAllStatus") : v === "open" ? t("filterStatusOpen") : t("statusClosed"))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterAllStatus")}</SelectItem>
            <SelectItem value="open">{t("filterStatusOpen")}</SelectItem>
            <SelectItem value="closed">{t("statusClosed")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v ?? ALL)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>
              {(v: string) =>
                v === ALL
                  ? t("filterAllAssignees")
                  : v === "unassigned"
                    ? t("unassigned")
                    : v === "me"
                      ? t("filterAssignedToMe")
                      : memberById.get(v)?.full_name || memberById.get(v)?.email || v
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filterAllAssignees")}</SelectItem>
            <SelectItem value="me">{t("filterAssignedToMe")}</SelectItem>
            <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tags.length > 0 ? (
          <Select value={tagFilter} onValueChange={(v) => setTagFilter(v ?? ALL)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue>{(v: string) => (v === ALL ? t("filterAllTags") : (tagById.get(v)?.name ?? v))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filterAllTags")}</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>{rows.length === 0 ? t("empty") : t("filterEmpty")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((conversation) => {
            const preview = previewByConversation[conversation.id];
            const assignee = conversation.assigned_to ? memberById.get(conversation.assigned_to) : null;
            const name = conversation.display_name || t("unknownUser");
            const conversationTags = conversation.tagIds.map((id) => tagById.get(id)).filter((tag): tag is Tag => Boolean(tag));

            return (
              <Link
                key={conversation.id}
                href={`/app/inbox/${conversation.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent",
                  conversation.status === "closed" && "opacity-60",
                )}
              >
                <Avatar>
                  {conversation.picture_url ? <AvatarImage src={conversation.picture_url} alt={name} /> : null}
                  <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium">{name}</p>
                    {conversation.status === "closed" ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {t("statusClosed")}
                      </Badge>
                    ) : null}
                    {conversationTags.map((tag) => (
                      <TagBadge key={tag.id} name={tag.name} color={tag.color} className="shrink-0 text-[10px]" />
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      {preview ? previewText(preview, t) : ""}
                    </p>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {new Date(conversation.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Badge variant={assignee ? "default" : "outline"} className="max-w-24 shrink-0">
                  {/* Badge is a flex+justify-center container — truncate has to go on this
                      inner block-level span, or overflow gets clipped symmetrically by the
                      centering instead of producing a trailing ellipsis. */}
                  <span className="truncate">{assignee ? assignee.full_name || assignee.email : t("unassigned")}</span>
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function previewText(preview: PreviewRow, t: ReturnType<typeof useTranslations>): string {
  if (preview.type === "image") return t("imageAlt");
  if (preview.type === "sticker") return t("stickerAlt");
  if (preview.type === "file") return preview.content || t("fileAlt");
  return preview.content ?? "";
}
