import {
  Inbox,
  Megaphone,
  BarChart3,
  LayoutGrid,
  MessageSquarePlus,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  Settings,
  FileClock,
  UserPlus,
  Link2,
  type LucideIcon,
} from "lucide-react";

export const navIcons = {
  inbox: Inbox,
  megaphone: Megaphone,
  barChart: BarChart3,
  layoutGrid: LayoutGrid,
  messageSquarePlus: MessageSquarePlus,
  building: Building2,
  users: Users,
  shieldCheck: ShieldCheck,
  creditCard: CreditCard,
  settings: Settings,
  fileClock: FileClock,
  userPlus: UserPlus,
  link: Link2,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof navIcons;
