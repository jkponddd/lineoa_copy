import "server-only";

import { createClient } from "./server";
import type { OrgRole } from "./database.types";

export type CurrentMembership = {
  user: { id: string; email: string | null; fullName: string | null };
  organization: { id: string; name: string; slug: string };
  role: OrgRole;
};

// A user can belong to more than one organization (see
// docs/decisions/0001-multi-tenancy-and-rls.md), but there's no org-switcher
// UI yet, so this picks the first membership as the "active" one. Revisit
// once multi-org switching is built.
//
// Two flat queries instead of an embedded select (`organizations (...)`):
// the hand-written Database type doesn't model foreign-table relationships,
// so supabase-js can't type an embedded result — keeping it flat keeps
// everything correctly typed until real generated types replace it.
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const [{ data: organization }, { data: profile }] = await Promise.all([
    supabase.from("organizations").select("id, name, slug").eq("id", membership.organization_id).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  if (!organization) return null;

  return {
    user: { id: user.id, email: user.email ?? null, fullName: profile?.full_name ?? null },
    organization,
    role: membership.role,
  };
}
