import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: ReactNode }) {
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

      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
