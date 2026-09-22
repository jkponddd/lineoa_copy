import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { RealtimeRefresh } from "@/components/inbox/realtime-refresh";
import { AssignSelect } from "@/components/inbox/assign-select";
import { MessageThread } from "@/components/inbox/message-thread";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MessageRow = {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image";
  content: string | null;
  media_path: string | null;
  created_at: string;
};

export default async function InboxThreadPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();

  const [{ data: conversation }, { data: messages }, { data: members }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, line_user_id, display_name, picture_url, assigned_to")
      .eq("id", conversationId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, direction, type, content, media_path, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .returns<MessageRow[]>(),
    supabase.rpc("get_organization_members", { p_organization_id: membership.organization.id }),
  ]);

  if (!conversation) notFound();

  const rows = messages ?? [];
  const imagePaths = rows.filter((m) => m.type === "image" && m.media_path).map((m) => m.media_path as string);

  const signedUrlByPath = new Map<string, string>();
  if (imagePaths.length > 0) {
    await Promise.all(
      imagePaths.map(async (path) => {
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
      />

      <MessageThread
        messages={rows.map((m) => ({
          ...m,
          imageUrl: m.media_path ? (signedUrlByPath.get(m.media_path) ?? null) : null,
        }))}
      />

      <ReplyComposer conversationId={conversationId} organizationId={membership.organization.id} />
    </div>
  );
}

function ThreadHeader({
  conversation,
  members,
}: {
  conversation: { id: string; display_name: string | null; picture_url: string | null; assigned_to: string | null };
  members: { user_id: string; role: string; email: string; full_name: string | null }[];
}) {
  const t = useTranslations("inbox");
  const name = conversation.display_name || t("unknownUser");

  return (
    <div className="flex items-center gap-3 border-b pb-3">
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
      <AssignSelect conversationId={conversation.id} assignedTo={conversation.assigned_to} members={members} />
    </div>
  );
}
