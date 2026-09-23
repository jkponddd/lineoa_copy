import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { RichMenuComposer, type AreaInput, type RichMenuInitialValues } from "@/components/rich-menu/rich-menu-composer";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { RichMenuAreaData } from "@/lib/supabase/database.types";

export default async function NewRichMenuPage({ searchParams }: { searchParams: Promise<{ copyFrom?: string }> }) {
  const { copyFrom } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return null;

  const orgId = membership.organization.id;
  const supabase = await createClient();

  const [{ data: channels }, { data: richMenus }] = await Promise.all([
    supabase.from("line_channels").select("id, display_name").eq("organization_id", orgId),
    supabase.from("rich_menus").select("id, name, layout, areas, is_default, status, line_channel_id").eq("organization_id", orgId),
  ]);

  const switchTargetsByChannel: Record<string, { id: string; name: string }[]> = {};
  for (const row of richMenus ?? []) {
    if (row.status !== "published") continue;
    (switchTargetsByChannel[row.line_channel_id] ??= []).push({ id: row.id, name: row.name });
  }

  let initialValues: RichMenuInitialValues | undefined;
  if (copyFrom) {
    const source = (richMenus ?? []).find((r) => r.id === copyFrom);
    if (source) {
      initialValues = {
        name: source.name,
        layout: source.layout,
        areas: (source.areas as RichMenuAreaData[]).map((a) => ({
          label: a.label,
          action_type: a.action_type,
          action_value: a.action_value,
          bounds: a.bounds ?? { x: 0, y: 0, width: 0, height: 0 },
        })) as AreaInput[],
      };
    }
  }

  return (
    <RichMenuView
      channels={channels ?? []}
      organizationId={orgId}
      switchTargetsByChannel={switchTargetsByChannel}
      initialValues={initialValues}
      isCopy={Boolean(initialValues)}
    />
  );
}

function RichMenuView({
  channels,
  organizationId,
  switchTargetsByChannel,
  initialValues,
  isCopy,
}: {
  channels: { id: string; display_name: string }[];
  organizationId: string;
  switchTargetsByChannel: Record<string, { id: string; name: string }[]>;
  initialValues: RichMenuInitialValues | undefined;
  isCopy: boolean;
}) {
  const t = useTranslations("richMenu");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{isCopy ? t("copyTitle") : t("composerTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Link href="/app/rich-menu" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          {t("backToList")}
        </Link>
      </div>

      <Card>
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
              initialValues={initialValues}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
