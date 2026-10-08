"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { logAuditEvent } from "@/lib/audit/log";
import type { AuthFormState } from "../../../(auth)/actions";

export async function updateOrganizationDefaults(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") {
    return { error: "Not authorized.", info: null };
  }

  const defaultLocale = String(formData.get("defaultLocale") ?? "th");
  const defaultTimezone = String(formData.get("defaultTimezone") ?? "Asia/Bangkok").trim();

  if (!["th", "en"].includes(defaultLocale)) {
    return { error: "invalidLocale", info: null };
  }
  if (!defaultTimezone) {
    return { error: "invalidTimezone", info: null };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ default_locale: defaultLocale, default_timezone: defaultTimezone })
    .eq("id", membership.organization.id);

  if (error) return { error: error.message, info: null };

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: membership.user.id,
    action: "organization.settings_updated",
    target: null,
    metadata: { default_locale: defaultLocale, default_timezone: defaultTimezone },
  });

  revalidatePath("/[locale]/(admin)/admin/settings", "page");
  return { error: null, info: "saved" };
}

export type DeleteOrgResult = { error: string | null };

// No audit log entry on success — the row would cascade-delete along with
// everything else in the same statement, so there'd be nothing left to
// read it back from.
export async function deleteOrganization(organizationId: string, confirmName: string): Promise<DeleteOrgResult> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") {
    return { error: "not_authorized" };
  }
  if (membership.organization.id !== organizationId) {
    return { error: "org_mismatch" };
  }
  if (confirmName.trim() !== membership.organization.name) {
    return { error: "name_mismatch" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_organization", { p_organization_id: organizationId });
  if (error) return { error: error.message };

  return { error: null };
}
