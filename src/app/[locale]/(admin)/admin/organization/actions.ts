"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { logAuditEvent } from "@/lib/audit/log";
import type { AuthFormState } from "../../../(auth)/actions";

export async function updateOrganizationName(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") {
    return { error: "Not authorized.", info: null };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "nameRequired", info: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ name }).eq("id", membership.organization.id);

  if (error) return { error: error.message, info: null };

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: membership.user.id,
    action: "organization.renamed",
    target: name,
    metadata: { from_name: membership.organization.name },
  });

  revalidatePath("/[locale]/(admin)/admin/organization", "page");
  return { error: null, info: "saved" };
}

export async function updateOrganizationLogo(logoUrl: string): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") {
    return { error: "not_authorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: logoUrl })
    .eq("id", membership.organization.id);

  if (error) return { error: error.message };

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: membership.user.id,
    action: "organization.logo_updated",
    target: null,
    metadata: {},
  });

  revalidatePath("/[locale]/(admin)/admin/organization", "page");
  return { error: null };
}
