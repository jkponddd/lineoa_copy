import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { StatTile } from "@/components/reports/stat-tile";
import { MessagesChart, type DayBucket } from "@/components/reports/messages-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TREND_DAYS = 14;

export default async function ReportsPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const orgId = membership.organization.id;

  const since = new Date();
  since.setDate(since.getDate() - (TREND_DAYS - 1));
  since.setHours(0, 0, 0, 0);

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
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "open"),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "closed"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("direction", "inbound"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("direction", "outbound"),
    supabase
      .from("messages")
      .select("created_at, direction")
      .eq("organization_id", orgId)
      .gte("created_at", since.toISOString())
      .returns<{ created_at: string; direction: "inbound" | "outbound" }[]>(),
    supabase
      .from("messages")
      .select("sent_by")
      .eq("organization_id", orgId)
      .eq("direction", "outbound")
      .not("sent_by", "is", null)
      .returns<{ sent_by: string }[]>(),
    supabase.rpc("get_organization_members", { p_organization_id: orgId }),
  ]);

  const dayBuckets = buildDayBuckets(recentMessages ?? [], TREND_DAYS);

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
  stats,
  dayBuckets,
  topAgents,
}: {
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
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("statTotalConversations")} value={stats.totalConversations} />
        <StatTile label={t("statOpenConversations")} value={stats.openConversations} />
        <StatTile label={t("statClosedConversations")} value={stats.closedConversations} />
        <StatTile label={t("statTotalMessages")} value={stats.totalMessages} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("chartTitle")}</CardTitle>
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
