import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";
import type { NavItem, PrimaryAction } from "./types";

type AppShellProps = {
  sectionTitle: string;
  navItems: NavItem[];
  primaryAction: PrimaryAction;
  children: ReactNode;
};

export function AppShell({ sectionTitle, navItems, primaryAction, children }: AppShellProps) {
  return (
    <div className="flex min-h-svh">
      <SidebarNav sectionTitle={sectionTitle} navItems={navItems} primaryAction={primaryAction} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 lg:px-6">
          <p className="text-sm font-semibold tracking-tight lg:hidden">{sectionTitle}</p>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 pb-28 lg:p-6 lg:pb-6">{children}</main>
      </div>

      <BottomNav navItems={navItems} primaryAction={primaryAction} />
    </div>
  );
}
