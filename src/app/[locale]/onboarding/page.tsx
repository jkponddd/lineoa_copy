import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { CreateOrganizationForm } from "@/components/auth/create-organization-form";

export default async function OnboardingPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const membership = await getCurrentMembership();
  if (membership) {
    redirect({ href: "/app", locale });
    return null;
  }

  return <OnboardingLayout />;
}

function OnboardingLayout() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-4 py-3 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {t("appName")}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <CreateOrganizationForm />
      </main>
    </div>
  );
}
