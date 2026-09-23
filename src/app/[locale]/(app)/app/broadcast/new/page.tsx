import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { getBroadcastComposerContext } from "@/app/[locale]/(app)/app/broadcast/data";
import { BroadcastComposer, type InitialComposerValues } from "@/components/broadcast/broadcast-composer";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { BroadcastBlock } from "@/lib/supabase/database.types";

export default async function NewBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; copyFrom?: string }>;
}) {
  const { draft: draftId, copyFrom } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return null;

  const orgId = membership.organization.id;
  const supabase = await createClient();
  const { channels, contacts } = await getBroadcastComposerContext(orgId);

  let initialValues: InitialComposerValues | null = null;
  let mode: "create" | "edit" | "copy" = "create";

  const sourceId = draftId ?? copyFrom;
  if (sourceId) {
    const query = supabase
      .from("broadcasts")
      .select("id, line_channel_id, blocks, audience, status")
      .eq("id", sourceId)
      .eq("organization_id", orgId);
    const { data: row } = draftId ? await query.eq("status", "draft").maybeSingle() : await query.maybeSingle();

    if (row) {
      mode = draftId ? "edit" : "copy";
      const blocks = row.blocks as BroadcastBlock[];
      const mediaPaths = blocks.flatMap((b) => (b.type === "image" ? [b.mediaPath] : b.type === "video" ? [b.mediaPath, b.previewMediaPath] : []));

      const mediaUrlByPath: Record<string, string> = {};
      if (mediaPaths.length > 0) {
        await Promise.all(
          mediaPaths.map(async (path) => {
            const { data } = await supabase.storage.from("line-media").createSignedUrl(path, 3600);
            if (data) mediaUrlByPath[path] = data.signedUrl;
          }),
        );
      }

      initialValues = {
        id: draftId ? row.id : null,
        lineChannelId: row.line_channel_id,
        blocks,
        mediaUrlByPath,
        audience: row.audience,
      };
    }
  }

  return <NewBroadcastView channels={channels} organizationId={orgId} contacts={contacts} initialValues={initialValues} mode={mode} />;
}

function NewBroadcastView({
  channels,
  organizationId,
  contacts,
  initialValues,
  mode,
}: {
  channels: { id: string; display_name: string }[];
  organizationId: string;
  contacts: Parameters<typeof BroadcastComposer>[0]["contacts"];
  initialValues: InitialComposerValues | null;
  mode: "create" | "edit" | "copy";
}) {
  const t = useTranslations("broadcast");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {mode === "edit" ? t("editingDraftTitle") : mode === "copy" ? t("copyTitle") : t("composerTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Link href="/app/broadcast" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
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
            <BroadcastComposer channels={channels} organizationId={organizationId} contacts={contacts} initialValues={initialValues} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
