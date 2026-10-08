import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { RealtimeRefresh } from "@/components/inbox/realtime-refresh";
import { InboxListView } from "@/components/inbox/inbox-list-view";
import type { ConversationStatus } from "@/lib/supabase/database.types";

type ConversationRow = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  assigned_to: string | null;
  last_message_at: string;
  status: ConversationStatus;
};

type PreviewRow = { conversation_id: string; type: "text" | "image" | "sticker" | "file"; content: string | null };

export default async function InboxListPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();

  const [{ data: conversations }, { data: members }, { data: tags }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, line_user_id, display_name, picture_url, assigned_to, last_message_at, status")
      .eq("organization_id", membership.organization.id)
      .order("last_message_at", { ascending: false })
      .returns<ConversationRow[]>(),
    supabase.rpc("get_organization_members", { p_organization_id: membership.organization.id }),
    supabase.from("tags").select("id, name, color").eq("organization_id", membership.organization.id).order("name"),
  ]);

  const rows = conversations ?? [];

  const previewByConversation: Record<string, PreviewRow> = {};
  const tagIdsByConversation = new Map<string, string[]>();

  if (rows.length > 0) {
    const conversationIds = rows.map((r) => r.id);
    const [{ data: recentMessages }, { data: conversationTagRows }] = await Promise.all([
      supabase
        .from("messages")
        .select("conversation_id, type, content")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .returns<PreviewRow[]>(),
      supabase.from("conversation_tags").select("conversation_id, tag_id").in("conversation_id", conversationIds),
    ]);

    for (const message of recentMessages ?? []) {
      if (!previewByConversation[message.conversation_id]) {
        previewByConversation[message.conversation_id] = message;
      }
    }

    for (const row of conversationTagRows ?? []) {
      const list = tagIdsByConversation.get(row.conversation_id) ?? [];
      list.push(row.tag_id);
      tagIdsByConversation.set(row.conversation_id, list);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresh table="conversations" filter={`organization_id=eq.${membership.organization.id}`} />
      <RealtimeRefresh table="messages" filter={`organization_id=eq.${membership.organization.id}`} />
      <InboxListView
        rows={rows.map((row) => ({ ...row, tagIds: tagIdsByConversation.get(row.id) ?? [] }))}
        previewByConversation={previewByConversation}
        members={members ?? []}
        tags={tags ?? []}
        currentUserId={membership.user.id}
      />
    </div>
  );
}
