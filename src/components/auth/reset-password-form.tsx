"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePassword, type AuthFormState } from "@/app/[locale]/(auth)/actions";

const initialState: AuthFormState = { error: null, info: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {label}
    </Button>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction] = useActionState(updatePassword, initialState);

  const errorMessage = state.error === "sessionExpired" ? t("sessionExpired") : state.error;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("resetPasswordTitle")}</CardTitle>
        <CardDescription>{t("resetPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <SubmitButton label={t("resetPasswordButton")} />
        </form>
      </CardContent>
    </Card>
  );
}
