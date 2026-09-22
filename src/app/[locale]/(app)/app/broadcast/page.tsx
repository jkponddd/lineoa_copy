import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { BroadcastComposer } from "@/components/broadcast/broadcast-composer";
import { CancelBroadcastButton } from "@/components/broadcast/cancel-broadcast-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { BroadcastAudience, BroadcastStatus } from "@/lib/supabase/database.types";

type BroadcastRow = {
  id: string;
  content: string | null;
  image_media_path: string | null;
  audience: BroadcastAudience;
  scheduled_at: string | null;
  status: BroadcastStatus;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
  line_channel_id: string;
};

const STATUS_BADGE_VARIANT: Record<BroadcastStatus, "default" | "destructive" | "outline" | "secondary"> = {
  scheduled: "outline",
  sending: "secondary",
  sent: "default",
  failed: "destructive",
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
      .select(
        "id, content, image_media_path, audience, scheduled_at, status, error_message, sent_by, created_at, line_channel_id",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .returns<BroadcastRow[]>(),
    supabase.rpc("get_organization_members", { p_organization_id: orgId }),
  ]);

  const channelNameById = new Map((channels ?? []).map((c) => [c.id, c.display_name]));
  const memberById = new Map((members ?? []).map((m) => [m.user_id, m]));

  const imagePaths = (history ?? []).filter((b) => b.image_media_path).map((b) => b.image_media_path as string);
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
    <BroadcastView
      channels={channels ?? []}
      organizationId={orgId}
      history={history ?? []}
      channelNameById={channelNameById}
      memberById={memberById}
      signedUrlByPath={signedUrlByPath}
    />
  );
}

function BroadcastView({
  channels,
  organizationId,
  history,
  channelNameById,
  memberById,
  signedUrlByPath,
}: {
  channels: { id: string; display_name: string }[];
  organizationId: string;
  history: BroadcastRow[];
  channelNameById: Map<string, string>;
  memberById: Map<string, { full_name: string | null; email: string }>;
  signedUrlByPath: Map<string, string>;
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
            <BroadcastComposer channels={channels} organizationId={organizationId} />
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
                  <TableHead>{t("tableAudience")}</TableHead>
                  <TableHead>{t("tableMessage")}</TableHead>
                  <TableHead>{t("tableSentBy")}</TableHead>
                  <TableHead>{t("tableStatus")}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((broadcast) => {
                  const sender = broadcast.sent_by ? memberById.get(broadcast.sent_by) : null;
                  const imageUrl = broadcast.image_media_path ? signedUrlByPath.get(broadcast.image_media_path) : null;
                  const isScheduled = broadcast.status === "scheduled";

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
                          <span className="truncate">{broadcast.content ?? t("imageOnlyLabel")}</span>
                        </div>
                      </TableCell>
                      <TableCell>{sender ? sender.full_name || sender.email : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE_VARIANT[broadcast.status]} title={broadcast.error_message ?? undefined}>
                          {t(`status${capitalize(broadcast.status)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isScheduled ? <CancelBroadcastButton broadcastId={broadcast.id} /> : null}
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
