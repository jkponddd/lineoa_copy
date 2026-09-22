"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
import { logAuditEvent } from "@/lib/audit/log";
import type { OrgRole } from "@/lib/supabase/database.types";
import type { AuthFormState } from "../../../(auth)/actions";

export async function addMember(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") {
    return { error: "Not authorized.", info: null };
  }

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "agent") as OrgRole;

  if (!email) {
    return { error: "emailRequired", info: null };
  }

  const supabase = await createClient();

  const { data: userId, error: lookupError } = await supabase.rpc("get_user_id_by_email", { p_email: email });
  if (lookupError) {
    return { error: lookupError.message, info: null };
  }
  if (!userId) {
    return { error: "userNotFound", info: null };
  }

  const { error: insertError } = await supabase
    .from("organization_members")
    .insert({ organization_id: membership.organization.id, user_id: userId, role });

  if (insertError) {
    const message = insertError.message.includes("duplicate key") ? "alreadyMember" : insertError.message;
    return { error: message, info: null };
  }

  await logAuditEvent({
    organizationId: membership.organization.id,
    actorId: membership.user.id,
    action: "member.added",
    target: email,
    metadata: { role },
  });

  revalidatePath("/[locale]/(admin)/admin/users", "page");
  return { error: null, info: "memberAdded" };
}

export async function updateMemberRole(memberId: string, role: OrgRole): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "not_authenticated" };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("id", memberId)
    .maybeSingle();

  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);

  if (!error && before) {
    const target = await resolveMemberEmail(supabase, membership.organization.id, before.user_id);
    await logAuditEvent({
      organizationId: membership.organization.id,
      actorId: membership.user.id,
      action: "member.role_changed",
      target,
      metadata: { from_role: before.role, to_role: role },
    });
  }

  revalidatePath("/[locale]/(admin)/admin/users", "page");
  return { error: error?.message ?? null };
}

export async function removeMember(memberId: string): Promise<{ error: string | null }> {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "not_authenticated" };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("id", memberId)
    .maybeSingle();

  // Resolved before the delete, not after — once the row is gone,
  // get_organization_members can no longer find it to look up the email.
  const target = before ? await resolveMemberEmail(supabase, membership.organization.id, before.user_id) : null;

  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);

  if (!error && before) {
    await logAuditEvent({
      organizationId: membership.organization.id,
      actorId: membership.user.id,
      action: "member.removed",
      target,
      metadata: { role: before.role },
    });
  }

  revalidatePath("/[locale]/(admin)/admin/users", "page");
  return { error: error?.message ?? null };
}

async function resolveMemberEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  userId: string,
): Promise<string> {
  const { data: members } = await supabase.rpc("get_organization_members", { p_organization_id: organizationId });
  return members?.find((m) => m.user_id === userId)?.email ?? userId;
}
