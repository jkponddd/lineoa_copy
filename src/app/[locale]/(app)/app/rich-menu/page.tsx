import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { RichMenuList, type RichMenuListItem } from "@/components/rich-menu/rich-menu-list";
import { Button } from "@/components/ui/button";
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
        channelId: row.line_channel_id,
        channelName: channelNameById.get(row.line_channel_id) ?? "—",
        imageUrl: signed?.signedUrl ?? null,
        errorMessage: row.error_message,
      };
    }),
  );

  return <RichMenuView channels={channels ?? []} items={items} />;
}

function RichMenuView({ channels, items }: { channels: { id: string; display_name: string }[]; items: RichMenuListItem[] }) {
  const t = useTranslations("richMenu");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button render={<Link href="/app/rich-menu/new" />} nativeButton={false} className="gap-2">
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
        <RichMenuList items={items} channels={channels} />
      )}
    </div>
  );
}
