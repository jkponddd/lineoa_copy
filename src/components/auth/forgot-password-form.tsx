"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset, type AuthFormState } from "@/app/[locale]/(auth)/actions";

const initialState: AuthFormState = { error: null, info: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {label}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction] = useActionState(requestPasswordReset, initialState);

  if (state.info === "resetEmailSent") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("forgotPasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("resetEmailSent")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("forgotPasswordTitle")}</CardTitle>
        <CardDescription>{t("forgotPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <SubmitButton label={t("sendResetLinkButton")} />

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-foreground underline underline-offset-4">
              {t("backToLogin")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
