import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/app-shell";
import type { NavItem, PrimaryAction } from "@/components/layout/types";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { redirect } from "@/i18n/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect({ href: "/onboarding", locale });
    return null;
  }

  // Admin Panel (org/user/role/billing/settings) is owner-only. Agents and
  // analysts get the same "no org" treatment as a missing membership would
  // be: sent back to the surface they're actually allowed to use.
  if (membership.role !== "owner") {
    redirect({ href: "/app", locale });
    return null;
  }

  return <AdminLayoutShell membership={membership}>{children}</AdminLayoutShell>;
}

function AdminLayoutShell({
  membership,
  children,
}: {
  membership: NonNullable<Awaited<ReturnType<typeof getCurrentMembership>>>;
  children: ReactNode;
}) {
  const t = useTranslations("admin");

  const navItems: NavItem[] = [
    { label: t("nav.organization"), href: "/admin/organization", icon: "building" },
    { label: t("nav.lineChannels"), href: "/admin/line-channels", icon: "link" },
    { label: t("nav.users"), href: "/admin/users", icon: "users" },
    { label: t("nav.roles"), href: "/admin/roles", icon: "shieldCheck" },
    { label: t("nav.tags"), href: "/admin/tags", icon: "tag" },
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
    <AppShell
      sectionTitle={t("sectionTitle")}
      navItems={navItems}
      primaryAction={primaryAction}
      user={{
        name: membership.user.fullName ?? "",
        email: membership.user.email ?? "",
        orgName: membership.organization.name,
      }}
    >
      {children}
    </AppShell>
  );
}
