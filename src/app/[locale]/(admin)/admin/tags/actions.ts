"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type TagActionResult = { error: string | null };

export async function createTagAction(organizationId: string, name: string, color: string): Promise<TagActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "nameRequired" };

  const supabase = await createClient();
  const { error } = await supabase.from("tags").insert({ organization_id: organizationId, name: trimmed, color });

  if (error) return { error: error.code === "23505" ? "duplicateName" : error.message };

  revalidatePath("/[locale]/(admin)/admin/tags", "page");
  revalidatePath("/[locale]/(app)/app/broadcast", "page");
  revalidatePath("/[locale]/(app)/app/inbox", "page");
  return { error: null };
}

export async function deleteTagAction(tagId: string): Promise<TagActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", tagId);

  if (error) return { error: error.message };

  revalidatePath("/[locale]/(admin)/admin/tags", "page");
  revalidatePath("/[locale]/(app)/app/broadcast", "page");
  revalidatePath("/[locale]/(app)/app/inbox", "page");
  return { error: null };
}
