import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { buildAlternates } from "@/lib/metadata-alternates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("forgotPasswordTitle"),
    description: t("forgotPasswordDescription"),
    alternates: buildAlternates(locale, "/forgot-password"),
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
