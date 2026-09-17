import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/layout/app-shell";
import type { NavItem, PrimaryAction } from "@/components/layout/types";

export default function AppLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("app");

  const navItems: NavItem[] = [
    { label: t("nav.inbox"), href: "/app/inbox", icon: "inbox" },
    { label: t("nav.broadcast"), href: "/app/broadcast", icon: "megaphone" },
    { label: t("nav.reports"), href: "/app/reports", icon: "barChart" },
    { label: t("nav.richMenu"), href: "/app/rich-menu", icon: "layoutGrid" },
  ];

  const primaryAction: PrimaryAction = {
    label: t("primaryAction"),
    href: "/app/inbox",
    icon: "messageSquarePlus",
  };

  return (
    <AppShell sectionTitle={t("sectionTitle")} navItems={navItems} primaryAction={primaryAction}>
      {children}
    </AppShell>
  );
}
