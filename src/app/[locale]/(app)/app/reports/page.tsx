import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { StatTile } from "@/components/reports/stat-tile";
import { MessagesChart, type DayBucket } from "@/components/reports/messages-chart";
import { ReportsFilters } from "@/components/reports/reports-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAY_OPTIONS = [7, 14, 30, 90];
const DEFAULT_DAYS = 14;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string; channel?: string }> }) {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const { days: daysParam, channel: channelParam } = await searchParams;
  const days = DAY_OPTIONS.includes(Number(daysParam)) ? Number(daysParam) : DEFAULT_DAYS;
  const channel = channelParam || "all";

  const supabase = await createClient();
  const orgId = membership.organization.id;

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const { data: lineChannels } = await supabase
    .from("line_channels")
    .select("id, display_name")
    .eq("organization_id", orgId)
    .order("display_name");

  // Open/closed/total conversation counts are a CURRENT snapshot (what's
  // open right now), not scoped to the selected date range — "open
  // conversations" means open today, not "opened in the last N days".
  // Message-based stats below (sent/received activity) are the ones that
  // actually vary with a date range, so those get `sinceIso` applied.
  let conversationsQuery = supabase.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  let openConversationsQuery = supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "open");
  let closedConversationsQuery = supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "closed");
  if (channel !== "all") {
    conversationsQuery = conversationsQuery.eq("line_channel_id", channel);
    openConversationsQuery = openConversationsQuery.eq("line_channel_id", channel);
    closedConversationsQuery = closedConversationsQuery.eq("line_channel_id", channel);
  }

  // Messages has no line_channel_id of its own (only conversation_id) — a
  // channel filter has to go through the conversations it belongs to first.
  let conversationIdsForChannel: string[] | null = null;
  if (channel !== "all") {
    const { data } = await supabase.from("conversations").select("id").eq("organization_id", orgId).eq("line_channel_id", channel);
    conversationIdsForChannel = (data ?? []).map((row) => row.id);
  }

  function scopedMessages() {
    let query = supabase.from("messages").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", sinceIso);
    if (conversationIdsForChannel) query = query.in("conversation_id", conversationIdsForChannel);
    return query;
  }

  let recentMessagesQueryBuilder = supabase.from("messages").select("created_at, direction").eq("organization_id", orgId).gte("created_at", sinceIso);
  let outboundSendersQueryBuilder = supabase
    .from("messages")
    .select("sent_by")
    .eq("organization_id", orgId)
    .eq("direction", "outbound")
    .gte("created_at", sinceIso)
    .not("sent_by", "is", null);
  if (conversationIdsForChannel) {
    recentMessagesQueryBuilder = recentMessagesQueryBuilder.in("conversation_id", conversationIdsForChannel);
    outboundSendersQueryBuilder = outboundSendersQueryBuilder.in("conversation_id", conversationIdsForChannel);
  }
  const recentMessagesQuery = recentMessagesQueryBuilder.returns<{ created_at: string; direction: "inbound" | "outbound" }[]>();
  const outboundSendersQuery = outboundSendersQueryBuilder.returns<{ sent_by: string }[]>();

  const [
    { count: totalConversations },
    { count: openConversations },
    { count: closedConversations },
    { count: totalMessages },
    { count: inboundMessages },
    { count: outboundMessages },
    { data: recentMessages },
    { data: outboundSenders },
    { data: members },
  ] = await Promise.all([
    conversationsQuery,
    openConversationsQuery,
    closedConversationsQuery,
    scopedMessages(),
    scopedMessages().eq("direction", "inbound"),
    scopedMessages().eq("direction", "outbound"),
    recentMessagesQuery,
    outboundSendersQuery,
    supabase.rpc("get_organization_members", { p_organization_id: orgId }),
  ]);

  const dayBuckets = buildDayBuckets(recentMessages ?? [], days);

  const sentCountByUserId = new Map<string, number>();
  for (const row of outboundSenders ?? []) {
    sentCountByUserId.set(row.sent_by, (sentCountByUserId.get(row.sent_by) ?? 0) + 1);
  }
  const memberById = new Map((members ?? []).map((m) => [m.user_id, m]));
  const topAgents = [...sentCountByUserId.entries()]
    .map(([userId, count]) => ({
      userId,
      count,
      label: memberById.get(userId)?.full_name || memberById.get(userId)?.email || userId,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <ReportsView
      days={days}
      channel={channel}
      channels={lineChannels ?? []}
      stats={{
        totalConversations: totalConversations ?? 0,
        openConversations: openConversations ?? 0,
        closedConversations: closedConversations ?? 0,
        totalMessages: totalMessages ?? 0,
        inboundMessages: inboundMessages ?? 0,
        outboundMessages: outboundMessages ?? 0,
      }}
      dayBuckets={dayBuckets}
      topAgents={topAgents}
    />
  );
}

function buildDayBuckets(
  messages: { created_at: string; direction: "inbound" | "outbound" }[],
  days: number,
): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, { date: key, inbound: 0, outbound: 0 });
  }

  for (const message of messages) {
    const key = message.created_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (message.direction === "inbound") bucket.inbound += 1;
    else bucket.outbound += 1;
  }

  return [...buckets.values()];
}

function ReportsView({
  days,
  channel,
  channels,
  stats,
  dayBuckets,
  topAgents,
}: {
  days: number;
  channel: string;
  channels: { id: string; display_name: string }[];
  stats: {
    totalConversations: number;
    openConversations: number;
    closedConversations: number;
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
  };
  dayBuckets: DayBucket[];
  topAgents: { userId: string; count: number; label: string }[];
}) {
  const t = useTranslations("reports");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ReportsFilters days={days} channel={channel} channels={channels} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("statTotalConversations")} value={stats.totalConversations} />
        <StatTile label={t("statOpenConversations")} value={stats.openConversations} />
        <StatTile label={t("statClosedConversations")} value={stats.closedConversations} />
        <StatTile label={t("statTotalMessages")} value={stats.totalMessages} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("chartTitle", { days })}</CardTitle>
        </CardHeader>
        <CardContent>
          <MessagesChart data={dayBuckets} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("topAgentsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {topAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("topAgentsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tableAgent")}</TableHead>
                  <TableHead>{t("tableMessagesSent")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAgents.map((agent) => (
                  <TableRow key={agent.userId}>
                    <TableCell>{agent.label}</TableCell>
                    <TableCell className="tabular-nums">{agent.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
