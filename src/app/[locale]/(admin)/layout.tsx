import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { AppShell } from "@/components/layout/app-shell";
import type { NavItem, PrimaryAction } from "@/components/layout/types";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");

  const navItems: NavItem[] = [
    { label: t("nav.organization"), href: "/admin/organization", icon: "building" },
    { label: t("nav.users"), href: "/admin/users", icon: "users" },
    { label: t("nav.roles"), href: "/admin/roles", icon: "shieldCheck" },
    { label: t("nav.billing"), href: "/admin/billing", icon: "creditCard" },
    { label: t("nav.settings"), href: "/admin/settings", icon: "settings" },
    { label: t("nav.auditLog"), href: "/admin/audit-log", icon: "fileClock" },
  ];

  const primaryAction: PrimaryAction = {
    label: t("primaryAction"),
    href: "/admin/users",
    icon: "userPlus",
  };

  return (
    <AppShell sectionTitle={t("sectionTitle")} navItems={navItems} primaryAction={primaryAction}>
      {children}
    </AppShell>
  );
}
