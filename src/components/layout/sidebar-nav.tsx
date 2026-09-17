"use client";

import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { navIcons } from "./icon-map";
import type { NavItem, PrimaryAction } from "./types";

type SidebarNavProps = {
  sectionTitle: string;
  navItems: NavItem[];
  primaryAction: PrimaryAction;
};

export function SidebarNav({ sectionTitle, navItems, primaryAction }: SidebarNavProps) {
  const pathname = usePathname();
  const PrimaryIcon = navIcons[primaryAction.icon];

  return (
    <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:bg-sidebar lg:text-sidebar-foreground">
      <div className="px-6 py-5">
        <p className="text-sm font-semibold tracking-tight">{sectionTitle}</p>
      </div>

      <div className="px-4">
        <Button
          render={<Link href={primaryAction.href} />}
          nativeButton={false}
          className="w-full justify-start gap-2"
        >
          <PrimaryIcon className="size-4" />
          {primaryAction.label}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const Icon = navIcons[item.icon];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
