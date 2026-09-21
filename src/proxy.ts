import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

const PROTECTED_PREFIXES = ["/app", "/admin"];

const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);

// next-intl's `redirect()` (used for the post-login `next` target) expects
// an internal, locale-agnostic pathname — it prepends the locale itself.
// Passing it a pathname that already has the locale prefix double-prefixes
// the URL (e.g. "/th/app" becomes "/th/th/app", a 404).
function stripLocale(pathname: string) {
  return pathname.replace(localePattern, "") || "/";
}

function isProtectedPath(pathnameWithoutLocale: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathnameWithoutLocale === prefix || pathnameWithoutLocale.startsWith(`${prefix}/`),
  );
}

export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  const user = await updateSession(request, response);
  const pathnameWithoutLocale = stripLocale(request.nextUrl.pathname);

  if (!user && isProtectedPath(pathnameWithoutLocale)) {
    const locale = routing.locales.find((l) => request.nextUrl.pathname.startsWith(`/${l}`)) ?? routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", pathnameWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // `auth` excluded alongside `api`: /auth/confirm (the email-link token
  // exchange route) isn't locale-prefixed and must never be rewritten to
  // /th/auth/confirm — found by testing the password reset flow, where
  // next-intl's routing was silently redirecting the link and breaking it.
  matcher: ["/((?!api|auth|trpc|_next|_vercel|.*\\..*).*)"],
};
