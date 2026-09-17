"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { TH, GB } from "country-flag-icons/react/3x2";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeFlags: Record<string, React.ComponentType<{ className?: string }>> = {
  th: TH,
  en: GB,
};

const localeLabels: Record<string, string> = {
  th: "ไทย",
  en: "English",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const ActiveFlag = localeFlags[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" aria-label={t("language")} className="gap-2" />}
      >
        <ActiveFlag className="h-4 w-auto rounded-xs" />
        <span className="hidden sm:inline">{localeLabels[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => {
          const Flag = localeFlags[loc];
          return (
            <DropdownMenuItem
              key={loc}
              onClick={() => router.replace(pathname, { locale: loc })}
              className="gap-2"
            >
              <Flag className="h-4 w-auto rounded-xs" />
              {localeLabels[loc]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
