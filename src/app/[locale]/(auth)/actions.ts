"use server";

import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export type AuthFormState = {
  error: string | null;
  info: string | null;
};

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app");
  const locale = String(formData.get("locale") ?? "th");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message, info: null };
  }

  redirect({ href: next, locale });
  return { error: null, info: null };
}

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const locale = String(formData.get("locale") ?? "th");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message, info: null };
  }

  if (!data.session) {
    // Email confirmation is required before a session is issued.
    return { error: null, info: "confirmEmail" };
  }

  redirect({ href: "/onboarding", locale });
  return { error: null, info: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: "/login", locale });
}
