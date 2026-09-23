"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContactPickerDialog, type BroadcastContact } from "@/components/broadcast/contact-picker-dialog";

// Moved out of the composer's body into a top-right dialog trigger — a
// utility/secondary action (test send doesn't affect the real draft or
// history) shouldn't compete for space with the primary compose flow, per
// the requested action-placement convention.
export function TestSendDialog({
  contacts,
  disabled,
  onSend,
}: {
  contacts: BroadcastContact[];
  disabled?: boolean;
  onSend: (targetUserId: string) => Promise<{ error: string | null }>;
}) {
  const t = useTranslations("broadcast");
  const [open, setOpen] = useState(false);
  const [testMode, setTestMode] = useState<"contact" | "uid">("contact");
  const [testTarget, setTestTarget] = useState<BroadcastContact | null>(null);
  const [testUid, setTestUid] = useState("");
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const uidMatch = contacts.find((c) => c.lineUserId === testUid.trim()) ?? null;
  const targetUserId = testMode === "contact" ? (testTarget?.lineUserId ?? "") : testUid.trim();

  function submit() {
    if (!targetUserId) return;
    setTestError(null);
    setTestSuccess(false);
    startTransition(async () => {
      const result = await onSend(targetUserId);
      if (result.error) {
        setTestError(result.error === "line_api_failed" ? t("sendError") : result.error);
        return;
      }
      setTestSuccess(true);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" disabled={disabled} className="gap-2" />}>
        <Send className="size-4" />
        {t("testSendTitle")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("testSendTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant={testMode === "contact" ? "default" : "outline"} onClick={() => setTestMode("contact")}>
              {t("testSendModeContact")}
            </Button>
            <Button type="button" size="sm" variant={testMode === "uid" ? "default" : "outline"} onClick={() => setTestMode("uid")}>
              {t("testSendModeUid")}
            </Button>
          </div>

          {testMode === "contact" ? (
            <div className="flex items-center gap-2">
              <ContactPickerDialog contacts={contacts} onSelect={setTestTarget} disabled={pending} />
              {testTarget ? (
                <div className="flex items-center gap-1.5 text-sm">
                  <Avatar className="size-6">
                    {testTarget.pictureUrl ? <AvatarImage src={testTarget.pictureUrl} alt="" /> : null}
                    <AvatarFallback>{(testTarget.displayName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{testTarget.displayName || t("testSendUnnamedContact")}</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Input value={testUid} onChange={(e) => setTestUid(e.target.value)} placeholder={t("testSendUidPlaceholder")} disabled={pending} />
              {testUid.trim() ? (
                uidMatch ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Avatar className="size-5">
                      {uidMatch.pictureUrl ? <AvatarImage src={uidMatch.pictureUrl} alt="" /> : null}
                      <AvatarFallback>{(uidMatch.displayName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{t("testSendUidResolved", { name: uidMatch.displayName || t("testSendUnnamedContact") })}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("testSendUidUnresolved")}</p>
                )
              ) : null}
            </div>
          )}

          {testError ? <p className="text-xs text-destructive">{testError}</p> : null}
          {testSuccess ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("testSendSuccess")}</p> : null}

          <div>
            <Button type="button" size="sm" disabled={pending || disabled || !targetUserId} onClick={submit}>
              {pending ? t("testSendSending") : t("testSendButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
