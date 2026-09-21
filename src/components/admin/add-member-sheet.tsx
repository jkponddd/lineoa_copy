"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { addMember } from "@/app/[locale]/(admin)/admin/users/actions";
import type { AuthFormState } from "@/app/[locale]/(auth)/actions";
import type { OrgRole } from "@/lib/supabase/database.types";

const initialState: AuthFormState = { error: null, info: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function AddMemberSheet() {
  const t = useTranslations("orgMembers");
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<OrgRole>("agent");
  const [state, formAction] = useActionState(addMember, initialState);

  const roleLabels: Record<OrgRole, string> = {
    owner: t("roleOwner"),
    agent: t("roleAgent"),
    analyst: t("roleAnalyst"),
  };

  const [lastHandledInfo, setLastHandledInfo] = useState(state.info);
  if (state.info !== lastHandledInfo) {
    setLastHandledInfo(state.info);
    if (state.info === "memberAdded") {
      setOpen(false);
    }
  }

  const errorMessage =
    state.error === "emailRequired"
      ? t("emailRequired")
      : state.error === "userNotFound"
        ? t("userNotFound")
        : state.error === "alreadyMember"
          ? t("alreadyMember")
          : state.error;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="gap-2" />}>
        <UserPlus className="size-4" />
        {t("addButton")}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("addTitle")}</SheetTitle>
          <SheetDescription>{t("addDescription")}</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4">
          <input type="hidden" name="role" value={role} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("roleLabel")}</Label>
            <Select value={role} onValueChange={(value) => setRole(value as OrgRole)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(value: OrgRole) => roleLabels[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">{t("roleOwner")}</SelectItem>
                <SelectItem value="agent">{t("roleAgent")}</SelectItem>
                <SelectItem value="analyst">{t("roleAnalyst")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <SheetFooter className="px-0">
            <SubmitButton label={t("addButton")} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
