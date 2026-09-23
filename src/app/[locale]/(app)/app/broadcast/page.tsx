import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { BroadcastHistoryTable, type BroadcastHistoryRow } from "@/components/broadcast/broadcast-history-table";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function BroadcastPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const orgId = membership.organization.id;

  const [{ data: channels }, { data: history }, { data: members }] = await Promise.all([
    supabase.from("line_channels").select("id, display_name").eq("organization_id", orgId),
    supabase
      .from("broadcasts")
      .select("id, blocks, audience, scheduled_at, status, error_message, sent_by, created_at, line_channel_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .returns<BroadcastHistoryRow[]>(),
    supabase.rpc("get_organization_members", { p_organization_id: orgId }),
  ]);

  const channelNameById = new Map((channels ?? []).map((c) => [c.id, c.display_name]));
  const memberById = new Map((members ?? []).map((m) => [m.user_id, m]));

  const mediaPaths = (history ?? []).flatMap((b) =>
    b.blocks.flatMap((block) => (block.type === "image" ? [block.mediaPath] : block.type === "video" ? [block.previewMediaPath] : [])),
  );
  const mediaUrlByPath = new Map<string, string>();
  if (mediaPaths.length > 0) {
    await Promise.all(
      [...new Set(mediaPaths)].map(async (path) => {
        const { data } = await supabase.storage.from("line-media").createSignedUrl(path, 3600);
        if (data) mediaUrlByPath.set(path, data.signedUrl);
      }),
    );
  }

  return (
    <BroadcastView
      channels={channels ?? []}
      history={history ?? []}
      channelNameById={channelNameById}
      memberById={memberById}
      mediaUrlByPath={mediaUrlByPath}
    />
  );
}

function BroadcastView({
  channels,
  history,
  channelNameById,
  memberById,
  mediaUrlByPath,
}: {
  channels: { id: string; display_name: string }[];
  history: BroadcastHistoryRow[];
  channelNameById: Map<string, string>;
  memberById: Map<string, { full_name: string | null; email: string }>;
  mediaUrlByPath: Map<string, string>;
}) {
  const t = useTranslations("broadcast");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button render={<Link href="/app/broadcast/new" />} nativeButton={false} className="gap-2">
          <Plus className="size-4" />
          {t("newButton")}
        </Button>
      </div>

      {channels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>{t("noChannels")}</p>
          <Link href="/admin/line-channels" className="mt-2 inline-block underline underline-offset-4">
            {t("connectChannelLink")}
          </Link>
        </div>
      ) : (
        <BroadcastHistoryTable
          history={history}
          channels={channels}
          channelNameById={channelNameById}
          memberById={memberById}
          mediaUrlByPath={mediaUrlByPath}
        />
      )}
    </div>
  );
}
