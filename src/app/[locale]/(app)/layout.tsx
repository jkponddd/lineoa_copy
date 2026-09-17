import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/app-shell";
import type { NavItem, PrimaryAction } from "@/components/layout/types";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { redirect } from "@/i18n/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const membership = await getCurrentMembership();

  if (!membership) {
    redirect({ href: "/onboarding", locale });
    return null;
  }

  return <AppLayoutShell membership={membership}>{children}</AppLayoutShell>;
}

function AppLayoutShell({
  membership,
  children,
}: {
  membership: NonNullable<Awaited<ReturnType<typeof getCurrentMembership>>>;
  children: ReactNode;
}) {
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
