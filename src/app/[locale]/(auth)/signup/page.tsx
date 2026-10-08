import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SignupForm } from "@/components/auth/signup-form";
import { buildAlternates } from "@/lib/metadata-alternates";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signupTitle"), description: t("signupDescription"), alternates: buildAlternates(locale, "/signup") };
}

export default function SignupPage() {
  return <SignupForm />;
}
