import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { BroadcastComposer } from "@/components/broadcast/broadcast-composer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { BroadcastStatus } from "@/lib/supabase/database.types";

type BroadcastRow = {
  id: string;
  content: string;
  status: BroadcastStatus;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
  line_channel_id: string;
};

export default async function BroadcastPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const orgId = membership.organization.id;

  const [{ data: channels }, { data: history }, { data: members }] = await Promise.all([
    supabase.from("line_channels").select("id, display_name").eq("organization_id", orgId),
    supabase
      .from("broadcasts")
      .select("id, content, status, error_message, sent_by, created_at, line_channel_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .returns<BroadcastRow[]>(),
    supabase.rpc("get_organization_members", { p_organization_id: orgId }),
  ]);

  const channelNameById = new Map((channels ?? []).map((c) => [c.id, c.display_name]));
  const memberById = new Map((members ?? []).map((m) => [m.user_id, m]));

  return (
    <BroadcastView
      channels={channels ?? []}
      history={history ?? []}
      channelNameById={channelNameById}
      memberById={memberById}
    />
  );
}

function BroadcastView({
  channels,
  history,
  channelNameById,
  memberById,
}: {
  channels: { id: string; display_name: string }[];
  history: BroadcastRow[];
  channelNameById: Map<string, string>;
  memberById: Map<string, { full_name: string | null; email: string }>;
}) {
  const t = useTranslations("broadcast");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("composerTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <p>{t("noChannels")}</p>
              <Link href="/admin/line-channels" className="mt-2 inline-block underline underline-offset-4">
                {t("connectChannelLink")}
              </Link>
            </div>
          ) : (
            <BroadcastComposer channels={channels} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tableTime")}</TableHead>
                  <TableHead>{t("tableChannel")}</TableHead>
                  <TableHead>{t("tableMessage")}</TableHead>
                  <TableHead>{t("tableSentBy")}</TableHead>
                  <TableHead>{t("tableStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((broadcast) => {
                  const sender = broadcast.sent_by ? memberById.get(broadcast.sent_by) : null;
                  return (
                    <TableRow key={broadcast.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(broadcast.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{channelNameById.get(broadcast.line_channel_id) ?? "—"}</TableCell>
                      <TableCell className="max-w-64 truncate">{broadcast.content}</TableCell>
                      <TableCell>{sender ? sender.full_name || sender.email : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={broadcast.status === "sent" ? "default" : "destructive"}
                          title={broadcast.error_message ?? undefined}
                        >
                          {broadcast.status === "sent" ? t("statusSent") : t("statusFailed")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
