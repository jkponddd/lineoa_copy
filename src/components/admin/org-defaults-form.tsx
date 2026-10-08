"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationDefaults } from "@/app/[locale]/(admin)/admin/settings/actions";
import type { AuthFormState } from "@/app/[locale]/(auth)/actions";
import { COMMON_TIMEZONES } from "@/lib/timezone";

const initialState: AuthFormState = { error: null, info: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {label}
    </Button>
  );
}

export function OrgDefaultsForm({ initialLocale, initialTimezone }: { initialLocale: string; initialTimezone: string }) {
  const t = useTranslations("systemSettings");
  const [state, formAction] = useActionState(updateOrganizationDefaults, initialState);
  const [locale, setLocale] = useState(initialLocale);
  const [timezone, setTimezone] = useState(initialTimezone);

  // Derived-from-props pattern (not useEffect) — same reasoning as
  // organization-name-form.tsx: flips `saved` exactly once per successful
  // submit without an extra effect-triggered render.
  const [lastHandledInfo, setLastHandledInfo] = useState(state.info);
  const [saved, setSaved] = useState(false);
  if (state.info !== lastHandledInfo) {
    setLastHandledInfo(state.info);
    setSaved(state.info === "saved");
  }

  const localeLabel: Record<string, string> = { th: t("localeThai"), en: t("localeEnglish") };
  // The full list always includes the org's current value even if it's
  // outside COMMON_TIMEZONES (e.g. hand-edited via the JSON... no, this
  // is a plain column — but a future org could still have a value this
  // list doesn't cover, so it's never silently dropped from the picker).
  const timezoneOptions = COMMON_TIMEZONES.includes(timezone as (typeof COMMON_TIMEZONES)[number])
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="defaultLocale" value={locale} />
      <input type="hidden" name="defaultTimezone" value={timezone} />

      <div className="flex flex-col gap-1.5">
        <Label>{t("defaultLocaleLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("defaultLocaleHint")}</p>
        <Select value={locale} onValueChange={(value) => setLocale(value ?? "th")}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue>{(value: string) => localeLabel[value] ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="th">{localeLabel.th}</SelectItem>
            <SelectItem value="en">{localeLabel.en}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("defaultTimezoneLabel")}</Label>
        <p className="text-xs text-muted-foreground">{t("defaultTimezoneHint")}</p>
        <Select value={timezone} onValueChange={(value) => setTimezone(value ?? "Asia/Bangkok")}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue>{(value: string) => value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {timezoneOptions.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {saved ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("saved")}</p> : null}

      <div>
        <SubmitButton label={t("saveButton")} />
      </div>
    </form>
  );
}
