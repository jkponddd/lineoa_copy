import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site-url";

// Builds the `alternates` block (canonical + hreflang) every public page
// needs: `pathSuffix` is the locale-agnostic part of the URL (e.g. "" for
// the homepage, "/login" for the login page) — the current `locale` only
// picks which of those URLs is canonical for this render.
export function buildAlternates(locale: string, pathSuffix = "") {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${pathSuffix}`]));
  return {
    canonical: `${SITE_URL}/${locale}${pathSuffix}`,
    languages: { ...languages, "x-default": `${SITE_URL}/${routing.defaultLocale}${pathSuffix}` },
  };
}
