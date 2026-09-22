"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SAMPLE_STICKERS, stickerThumbnailUrl } from "@/lib/line/sample-stickers";
import { sendStickerReply } from "@/app/[locale]/(app)/app/inbox/actions";

export function StickerPickerDialog({
  conversationId,
  disabled,
  onSent,
  onError,
}: {
  conversationId: string;
  disabled?: boolean;
  onSent?: () => void;
  onError?: () => void;
}) {
  const t = useTranslations("inbox");
  const [pending, startTransition] = useTransition();

  function handlePick(packageId: string, stickerId: string) {
    startTransition(async () => {
      const result = await sendStickerReply(conversationId, packageId, stickerId);
      if (result.error) onError?.();
      else onSent?.();
    });
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="icon" disabled={disabled || pending} />}>
        <Smile className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("stickerPickerTitle")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          {SAMPLE_STICKERS.map((sticker) => (
            <DialogClose
              key={sticker.stickerId}
              render={
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handlePick(sticker.packageId, sticker.stickerId)}
                  className="flex items-center justify-center rounded-md border p-2 hover:bg-accent disabled:opacity-50"
                />
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- LINE's own public sticker CDN */}
              <img src={stickerThumbnailUrl(sticker.stickerId)} alt={t("stickerAlt")} className="size-12 object-contain" />
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
