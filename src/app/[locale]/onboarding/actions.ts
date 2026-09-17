"use server";

import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import type { AuthFormState } from "../(auth)/actions";

function slugify(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "org"}-${suffix}`;
}

export async function createOrganization(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "nameRequired", info: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").insert({ name, slug: slugify(name) });

  if (error) {
    return { error: error.message, info: null };
  }

  const locale = await getLocale();
  redirect({ href: "/app", locale });
  return { error: null, info: null };
}
