import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { RealtimeRefresh } from "@/components/inbox/realtime-refresh";
import { AssignSelect } from "@/components/inbox/assign-select";
import { StatusToggle } from "@/components/inbox/status-toggle";
import { ConversationTags } from "@/components/inbox/conversation-tags";
import { MessageThread } from "@/components/inbox/message-thread";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ConversationStatus } from "@/lib/supabase/database.types";

type MessageRow = {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "sticker" | "file";
  content: string | null;
  media_path: string | null;
  created_at: string;
};

export default async function InboxThreadPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();

  const [{ data: conversation }, { data: messages }, { data: members }, { data: allTags }, { data: conversationTagRows }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id, line_user_id, display_name, picture_url, assigned_to, status")
        .eq("id", conversationId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id, direction, type, content, media_path, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .returns<MessageRow[]>(),
      supabase.rpc("get_organization_members", { p_organization_id: membership.organization.id }),
      supabase.from("tags").select("id, name, color").eq("organization_id", membership.organization.id).order("name"),
      supabase.from("conversation_tags").select("tag_id").eq("conversation_id", conversationId),
    ]);

  if (!conversation) notFound();

  const assignedTagIds = new Set((conversationTagRows ?? []).map((row) => row.tag_id));
  const assignedTags = (allTags ?? []).filter((tag) => assignedTagIds.has(tag.id));

  const rows = messages ?? [];
  // Both "image" and "file" messages carry their bytes in Storage; sticker
  // content is a public CDN URL built client-side, no signed URL needed.
  const mediaPaths = rows.filter((m) => m.media_path).map((m) => m.media_path as string);

  const signedUrlByPath = new Map<string, string>();
  if (mediaPaths.length > 0) {
    await Promise.all(
      mediaPaths.map(async (path) => {
        const { data } = await supabase.storage.from("line-media").createSignedUrl(path, 3600);
        if (data) signedUrlByPath.set(path, data.signedUrl);
      }),
    );
  }

  return (
    <div className="flex h-[calc(100svh-9rem)] flex-col gap-3 lg:h-[calc(100svh-7rem)]">
      <RealtimeRefresh table="messages" filter={`conversation_id=eq.${conversationId}`} />
      <RealtimeRefresh table="conversations" filter={`id=eq.${conversationId}`} />

      <ThreadHeader
        conversation={conversation}
        members={members ?? []}
        allTags={allTags ?? []}
        assignedTags={assignedTags}
      />

      <MessageThread
        messages={rows.map((m) => ({
          ...m,
          mediaUrl: m.media_path ? (signedUrlByPath.get(m.media_path) ?? null) : null,
        }))}
      />

      <ReplyComposer conversationId={conversationId} organizationId={membership.organization.id} />
    </div>
  );
}

function ThreadHeader({
  conversation,
  members,
  allTags,
  assignedTags,
}: {
  conversation: {
    id: string;
    display_name: string | null;
    picture_url: string | null;
    assigned_to: string | null;
    status: ConversationStatus;
  };
  members: { user_id: string; role: string; email: string; full_name: string | null }[];
  allTags: { id: string; name: string; color: string }[];
  assignedTags: { id: string; name: string; color: string }[];
}) {
  const t = useTranslations("inbox");
  const name = conversation.display_name || t("unknownUser");

  return (
    <div className="flex flex-col gap-2 border-b pb-3">
      <div className="flex items-center gap-3">
        <Link
          href="/app/inbox"
          className="text-muted-foreground hover:text-foreground lg:hidden"
          aria-label={t("backToList")}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar>
          {conversation.picture_url ? <AvatarImage src={conversation.picture_url} alt={name} /> : null}
          <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="min-w-0 flex-1 truncate font-medium">{name}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ConversationTags conversationId={conversation.id} assignedTags={assignedTags} allTags={allTags} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AssignSelect conversationId={conversation.id} assignedTo={conversation.assigned_to} members={members} />
          <StatusToggle conversationId={conversation.id} status={conversation.status} />
        </div>
      </div>
    </div>
  );
}
