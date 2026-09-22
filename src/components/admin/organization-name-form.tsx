"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrganizationName } from "@/app/[locale]/(admin)/admin/organization/actions";
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

export function OrganizationNameForm({ initialName }: { initialName: string }) {
  const t = useTranslations("orgSettings");
  const [state, formAction] = useActionState(updateOrganizationName, initialState);

  // Derived-from-props pattern (not useEffect) to flag a successful save —
  // same approach used in add-member-sheet.tsx for the same reason: setting
  // state synchronously inside an effect body causes an avoidable extra render.
  const [lastHandledInfo, setLastHandledInfo] = useState(state.info);
  const [saved, setSaved] = useState(false);
  if (state.info !== lastHandledInfo) {
    setLastHandledInfo(state.info);
    setSaved(state.info === "saved");
  }

  const errorMessage = state.error === "nameRequired" ? t("nameRequired") : state.error;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        {/* Keyed on initialName: after a successful save, the server
            re-fetches and passes a new initialName into this already-mounted
            client component. An uncontrolled Input's defaultValue only
            applies at mount, so without the key React would just update
            props on the same instance and Base UI warns ("changing the
            default value state of an uncontrolled FieldControl after being
            initialized") — the key forces a clean remount instead. */}
        <Input key={initialName} id="name" name="name" defaultValue={initialName} required maxLength={100} />
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {saved ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("saved")}</p> : null}

      <div>
        <SubmitButton label={t("saveButton")} />
      </div>
    </form>
  );
}
