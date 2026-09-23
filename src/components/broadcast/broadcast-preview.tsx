"use client";

import { useTranslations } from "next-intl";

import type { BroadcastTemplate } from "@/lib/supabase/database.types";

// A phone-shaped mockup, same idea as RichMenuPhonePreview — shows what the
// broadcast will actually look like as a chat bubble rather than an
// abstract form. Read-only (no drag/edit interaction needed here, unlike
// the rich menu editor).
export function BroadcastPreview({
  template,
  content,
  imageUrl,
  linkLabel,
}: {
  template: BroadcastTemplate;
  content: string;
  imageUrl: string | null;
  linkLabel: string;
}) {
  const t = useTranslations("broadcast");
  const hasContent = content.trim().length > 0;
  const hasImage = Boolean(imageUrl);

  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="rounded-[28px] border-4 border-foreground/80 bg-background p-1.5 shadow-sm">
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-muted/30">
          <div className="flex flex-col gap-1.5 bg-background p-2.5">
            <div className="h-1.5 w-16 rounded-full bg-muted" />
          </div>

          <div className="flex flex-col gap-2 border-t border-border p-3">
            {!hasContent && !hasImage ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("previewEmpty")}</p>
            ) : template === "image_link" ? (
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview / signed URL
                  <img src={imageUrl} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
                    {t("templateImageLink")}
                  </div>
                )}
                <div className="flex flex-col gap-2 p-2">
                  {hasContent ? <p className="text-xs">{content}</p> : null}
                  <div className="rounded-md border border-border py-1.5 text-center text-xs font-medium text-primary">
                    {linkLabel.trim() || t("linkLabelPlaceholder")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview / signed URL
                  <img src={imageUrl ?? undefined} alt="" className="max-h-40 w-fit max-w-full rounded-lg rounded-tl-sm object-cover" />
                ) : null}
                {hasContent ? (
                  <div className="w-fit max-w-full rounded-lg rounded-tl-sm bg-muted px-2.5 py-1.5 text-xs whitespace-pre-wrap break-words">
                    {content}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
