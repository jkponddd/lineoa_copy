import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { RichMenuComposer } from "@/components/rich-menu/rich-menu-composer";
import { RichMenuList, type RichMenuListItem } from "@/components/rich-menu/rich-menu-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { RichMenuAreaData, RichMenuLayout, RichMenuStatus } from "@/lib/supabase/database.types";

type RichMenuRow = {
  id: string;
  name: string;
  layout: RichMenuLayout;
  image_path: string;
  areas: RichMenuAreaData[];
  is_default: boolean;
  status: RichMenuStatus;
  error_message: string | null;
  line_channel_id: string;
};

export default async function RichMenuPage() {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const orgId = membership.organization.id;

  const [{ data: channels }, { data: richMenus }] = await Promise.all([
    supabase.from("line_channels").select("id, display_name").eq("organization_id", orgId),
    supabase
      .from("rich_menus")
      .select("id, name, layout, image_path, areas, is_default, status, error_message, line_channel_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .returns<RichMenuRow[]>(),
  ]);

  const channelNameById = new Map((channels ?? []).map((c) => [c.id, c.display_name]));

  const items: RichMenuListItem[] = await Promise.all(
    (richMenus ?? []).map(async (row) => {
      const { data: signed } =
        row.status === "published"
          ? await supabase.storage.from("rich-menu-images").createSignedUrl(row.image_path, 3600)
          : { data: null };

      return {
        id: row.id,
        name: row.name,
        layout: row.layout,
        status: row.status,
        isDefault: row.is_default,
        channelName: channelNameById.get(row.line_channel_id) ?? "—",
        imageUrl: signed?.signedUrl ?? null,
        errorMessage: row.error_message,
      };
    }),
  );

  const switchTargetsByChannel: Record<string, { id: string; name: string }[]> = {};
  for (const row of richMenus ?? []) {
    if (row.status !== "published") continue;
    (switchTargetsByChannel[row.line_channel_id] ??= []).push({ id: row.id, name: row.name });
  }

  return (
    <RichMenuView
      channels={channels ?? []}
      organizationId={orgId}
      items={items}
      switchTargetsByChannel={switchTargetsByChannel}
    />
  );
}

function RichMenuView({
  channels,
  organizationId,
  items,
  switchTargetsByChannel,
}: {
  channels: { id: string; display_name: string }[];
  organizationId: string;
  items: RichMenuListItem[];
  switchTargetsByChannel: Record<string, { id: string; name: string }[]>;
}) {
  const t = useTranslations("richMenu");

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
            <RichMenuComposer
              channels={channels}
              organizationId={organizationId}
              switchTargetsByChannel={switchTargetsByChannel}
            />
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold">{t("listTitle")}</h2>
        <RichMenuList items={items} />
      </div>
    </div>
  );
}
