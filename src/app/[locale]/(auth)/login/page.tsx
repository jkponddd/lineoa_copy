import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { buildAlternates } from "@/lib/metadata-alternates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle"), description: t("loginDescription"), alternates: buildAlternates(locale, "/login") };
}

export default function LoginPage() {
  return <LoginForm />;
}
