"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { deleteOrganization } from "@/app/[locale]/(admin)/admin/settings/actions";

export function DangerZoneCard({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const t = useTranslations("systemSettings");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = confirmText.trim() === organizationName;

  function handleDelete() {
    if (!canDelete) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteOrganization(organizationId, confirmText);
      if (result.error) {
        setError(result.error === "name_mismatch" ? t("deleteNameMismatch") : result.error);
        return;
      }
      router.push("/onboarding");
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="size-4" />
          {t("dangerZoneTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("deleteOrgDescription")}</p>
        <div>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setConfirmText("");
                setError(null);
              }
            }}
          >
            <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
              {t("deleteOrgButton")}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("deleteOrgConfirmTitle")}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{t("deleteOrgConfirmDescription", { name: organizationName })}</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-org-name">{t("deleteOrgConfirmLabel")}</Label>
                <Input id="confirm-org-name" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} disabled={pending} autoComplete="off" />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>{t("cancelButton")}</DialogClose>
                <Button type="button" variant="destructive" disabled={!canDelete || pending} onClick={handleDelete}>
                  {pending ? t("deletingOrg") : t("deleteOrgButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
