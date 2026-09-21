import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { ConnectLineChannelSheet } from "@/components/admin/connect-line-channel-sheet";
import { DisconnectLineChannelButton } from "@/components/admin/disconnect-line-channel-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LineChannelsPage() {
  const membership = await getCurrentMembership();
  const supabase = await createClient();

  const { data: channels } = membership
    ? await supabase
        .from("line_channels")
        .select("id, line_channel_id, display_name, created_at")
        .eq("organization_id", membership.organization.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return <LineChannelsView channels={channels ?? []} />;
}

function LineChannelsView({
  channels,
}: {
  channels: { id: string; line_channel_id: string; display_name: string; created_at: string }[];
}) {
  const t = useTranslations("lineChannels");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ConnectLineChannelSheet />
      </div>

      {channels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">{t("empty")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader>
                <CardTitle className="text-base">{channel.display_name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  {t("channelIdLabelShort")}: {channel.line_channel_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("connectedAt")}: {new Date(channel.created_at).toLocaleDateString()}
                </p>
                <DisconnectLineChannelButton lineChannelId={channel.line_channel_id} label={t("disconnectButton")} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
