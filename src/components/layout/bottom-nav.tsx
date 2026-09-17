"use client";

import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { navIcons } from "./icon-map";
import type { NavItem, PrimaryAction } from "./types";

type BottomNavProps = {
  navItems: NavItem[];
  primaryAction: PrimaryAction;
};

export function BottomNav({ navItems, primaryAction }: BottomNavProps) {
  const pathname = usePathname();
  const PrimaryIcon = navIcons[primaryAction.icon];

  // Bottom nav is real-estate constrained on small screens — cap the number
  // of visible tabs so labels don't overlap. The full list still shows in
  // the desktop sidebar.
  const visibleItems = navItems.slice(0, 4);
  const half = Math.ceil(visibleItems.length / 2);
  const leftItems = visibleItems.slice(0, half);
  const rightItems = visibleItems.slice(half);

  const renderItem = (item: NavItem) => {
    const Icon = navIcons[item.icon];
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
        <span className="w-full truncate text-center">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
      <div className="relative mx-auto flex max-w-lg items-stretch">
        <div className="flex min-w-0 flex-1">{leftItems.map(renderItem)}</div>

        <div className="flex w-20 shrink-0 items-start justify-center">
          <Link
            href={primaryAction.href}
            aria-label={primaryAction.label}
            className="absolute -top-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
          >
            <PrimaryIcon className="size-6" />
          </Link>
        </div>

        <div className="flex min-w-0 flex-1">{rightItems.map(renderItem)}</div>
      </div>
      <div className="h-safe-bottom" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
