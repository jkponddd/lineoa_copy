import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Not under src/app/[locale]/ — this is the link target inside auth emails
// (password recovery, and signup confirmation if that template is ever
// switched to this same pattern), which carries its own token_hash/type/next
// rather than a locale. Exchanges the one-time token for a real session
// (setting cookies via the server client) before handing off to `next`,
// which is where locale-aware UI takes back over.
//
// `next` here is a FULL URL (whatever was passed as `redirectTo` to the
// Supabase auth call that generated this link, e.g. resetPasswordForEmail —
// see requestPasswordReset in (auth)/actions.ts), not a bare pathname; the
// email template assembles it as {{ .RedirectTo }}.
// https://supabase.com/docs/guides/auth/passwords (server-side email link flow)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (tokenHash && type && next) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(next);
    }
  }

  const fallback = request.nextUrl.clone();
  fallback.pathname = "/login";
  fallback.search = "";
  fallback.searchParams.set("error", "linkExpired");
  return NextResponse.redirect(fallback);
}
