"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { connectLineChannel } from "@/app/[locale]/(admin)/admin/line-channels/actions";
import type { AuthFormState } from "@/app/[locale]/(auth)/actions";

const initialState: AuthFormState = { error: null, info: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function ConnectLineChannelSheet() {
  const t = useTranslations("lineChannels");
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(connectLineChannel, initialState);

  // Close the sheet once the action reports success. Adjusting state during
  // render (rather than in an effect) per React's guidance for "reset/adjust
  // state when a value changes" — avoids an extra cascading render pass.
  const [lastHandledInfo, setLastHandledInfo] = useState(state.info);
  if (state.info !== lastHandledInfo) {
    setLastHandledInfo(state.info);
    if (state.info === "connected") {
      setOpen(false);
    }
  }

  const errorMessage =
    state.error === "nameRequired"
      ? t("displayNameLabel")
      : state.error === "invalidToken"
        ? t("invalidToken")
        : state.error === "duplicateChannel"
          ? t("duplicateChannel")
          : state.error;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="gap-2" />}>
        <Link2 className="size-4" />
        {t("connectButton")}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("connectTitle")}</SheetTitle>
          <SheetDescription>{t("connectDescription")}</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">{t("displayNameLabel")}</Label>
            <Input id="displayName" name="displayName" placeholder={t("displayNamePlaceholder")} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channelId">{t("channelIdLabel")}</Label>
            <Input id="channelId" name="channelId" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channelSecret">{t("channelSecretLabel")}</Label>
            <Input id="channelSecret" name="channelSecret" type="password" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channelAccessToken">{t("channelAccessTokenLabel")}</Label>
            <Input id="channelAccessToken" name="channelAccessToken" type="password" required />
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <SheetFooter className="px-0">
            <SubmitButton label={t("connectButton")} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
