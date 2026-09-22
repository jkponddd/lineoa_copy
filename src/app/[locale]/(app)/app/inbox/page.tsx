import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RealtimeRefresh } from "@/components/inbox/realtime-refresh";
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
};

type PreviewRow = { conversation_id: string; type: "text" | "image"; content: string | null };

export default async function InboxListPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();

  const [{ data: conversations }, { data: members }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, line_user_id, display_name, picture_url, assigned_to, last_message_at, status")
      .eq("organization_id", membership.organization.id)
      .order("last_message_at", { ascending: false })
      .returns<ConversationRow[]>(),
    supabase.rpc("get_organization_members", { p_organization_id: membership.organization.id }),
  ]);

  const rows = conversations ?? [];
  const memberById = new Map((members ?? []).map((m) => [m.user_id, m]));

  const previewByConversation = new Map<string, PreviewRow>();
  if (rows.length > 0) {
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id, type, content")
      .in(
        "conversation_id",
        rows.map((r) => r.id),
      )
      .order("created_at", { ascending: false })
      .returns<PreviewRow[]>();

    for (const message of recentMessages ?? []) {
      if (!previewByConversation.has(message.conversation_id)) {
        previewByConversation.set(message.conversation_id, message);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresh table="conversations" filter={`organization_id=eq.${membership.organization.id}`} />
      <RealtimeRefresh table="messages" filter={`organization_id=eq.${membership.organization.id}`} />
      <InboxListView rows={rows} previewByConversation={previewByConversation} memberById={memberById} />
    </div>
  );
}

function InboxListView({
  rows,
  previewByConversation,
  memberById,
}: {
  rows: ConversationRow[];
  previewByConversation: Map<string, PreviewRow>;
  memberById: Map<string, { full_name: string | null; email: string }>;
}) {
  const t = useTranslations("inbox");

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((conversation) => {
        const preview = previewByConversation.get(conversation.id);
        const assignee = conversation.assigned_to ? memberById.get(conversation.assigned_to) : null;
        const name = conversation.display_name || t("unknownUser");

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
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {preview ? (preview.type === "image" ? t("imageAlt") : preview.content) : ""}
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
  );
}
