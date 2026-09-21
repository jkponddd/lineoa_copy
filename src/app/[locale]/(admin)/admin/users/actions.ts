"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/supabase/get-current-membership";
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

  revalidatePath("/[locale]/(admin)/admin/users", "page");
  return { error: null, info: "memberAdded" };
}

export async function updateMemberRole(memberId: string, role: OrgRole): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);
  revalidatePath("/[locale]/(admin)/admin/users", "page");
  return { error: error?.message ?? null };
}

export async function removeMember(memberId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
  revalidatePath("/[locale]/(admin)/admin/users", "page");
  return { error: error?.message ?? null };
}
