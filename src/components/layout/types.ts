import type { NavIconName } from "./icon-map";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIconName;
};

export type PrimaryAction = {
  label: string;
  icon: NavIconName;
  href: string;
};
