"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createOrganization } from "@/app/[locale]/onboarding/actions";
import type { AuthFormState } from "@/app/[locale]/(auth)/actions";

const initialState: AuthFormState = { error: null, info: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {label}
    </Button>
  );
}

export function CreateOrganizationForm() {
  const t = useTranslations("onboarding");
  const [state, formAction] = useActionState(createOrganization, initialState);

  const errorMessage = state.error === "nameRequired" ? t("nameRequired") : state.error;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("orgNameLabel")}</Label>
            <Input id="name" name="name" type="text" placeholder={t("orgNamePlaceholder")} required />
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <SubmitButton label={t("createButton")} />
        </form>
      </CardContent>
    </Card>
  );
}
