"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

export async function getSiteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

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

export async function requestPasswordReset(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const locale = String(formData.get("locale") ?? "th");

  const supabase = await createClient();
  const origin = await getSiteOrigin();

  // This becomes {{ .RedirectTo }} in the "Reset Password" email template,
  // which must be set to:
  //   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}
  // (Supabase dashboard → Authentication → Email Templates.) Passing the
  // final destination here, not the /auth/confirm URL itself — the template
  // is what assembles those into the actual link the user clicks.
  //
  // resetPasswordForEmail never reveals whether the address is registered
  // (Supabase's own anti-enumeration behavior) — the UI shows the same
  // "check your email" message regardless, matching that intentionally.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/${locale}/reset-password`,
  });

  if (error) {
    return { error: error.message, info: null };
  }

  return { error: null, info: "resetEmailSent" };
}

export async function updatePassword(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "th");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "sessionExpired", info: null };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message, info: null };
  }

  redirect({ href: "/app", locale });
  return { error: null, info: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: "/login", locale });
}
