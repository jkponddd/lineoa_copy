# Progress Log

Running log of work on the LINE OA Management Platform. Append a new dated entry after every session.

---

## 2026-09-17 — Phase 1, Step 1: Project scaffold

**What was built**

- Initialized Next.js (App Router, TypeScript, Turbopack) in the repo root via `create-next-app`, moved into place around the pre-existing `CLAUDE.md`.
- Tailwind CSS v4 + shadcn/ui installed and initialized (`components.json`, base color `neutral`). Base primitive library is **Base UI** (`@base-ui/react`), not Radix — shadcn's newer default. Added `button`, `separator`, `dropdown-menu`, `avatar`, `sheet` components.
- Supabase client helpers: `src/lib/supabase/client.ts` (browser, `createBrowserClient`) and `src/lib/supabase/server.ts` (server, `createServerClient` + `next/headers` cookies). `.env.local.example` added at repo root with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` placeholders. No Supabase project is wired up yet — client helpers just establish the pattern.
- i18n via `next-intl` v4, Thai (`th`) default / English (`en`). Locale-prefixed routing (`/th/...`, `/en/...`) via `src/proxy.ts` (Next 16 renamed the middleware convention to "proxy" — file was renamed accordingly, not left as deprecated `middleware.ts`). Translation messages in `src/messages/{th,en}.json`. `LanguageSwitcher` component uses `country-flag-icons` (flagpedia-style SVGs) for TH/GB flags, not emoji.
- Theme provider (`next-themes`, class-based, `system` default) + `ThemeToggle` dropdown (light/dark/system), wired through `[locale]/layout.tsx`.
- Three route groups under `src/app/[locale]/`:
  - `(marketing)` → `/` — Homepage placeholder with header (logo, language switcher, theme toggle).
  - `(app)/app` → `/app` — User App placeholder, responsive shell.
  - `(admin)/admin` → `/admin` — Admin Panel placeholder, responsive shell.
  - Note: route groups alone don't add URL segments, so `(app)` and `(admin)` each nest an actual `app/`/`admin/` path folder inside them to avoid colliding with `(marketing)`'s `/`.
- Shared responsive shell (`src/components/layout/app-shell.tsx` + `sidebar-nav.tsx` + `bottom-nav.tsx`): left sidebar with full nav list + primary action button on desktop (`lg:` breakpoint and up); fixed bottom nav with a raised center primary-action button (banking-app pattern) on mobile/tablet. Bottom nav caps at 4 visible items to avoid label overlap on narrow screens (admin's 6 nav items all show in the desktop sidebar; a "more" affordance for the overflow items on mobile is left for a later step). Nav item icons are passed as string keys (`src/components/layout/icon-map.tsx`) rather than component references, since the layouts are Server Components and React can't serialize function props across the server/client boundary to the client-side nav components.
- `PROGRESS.md` (this file).

**Key decisions**

- URL structure: marketing at `/`, user app under `/app`, admin under `/admin`, all locale-prefixed (e.g. `/th/app`, `/en/admin`).
- shadcn/ui's Base UI primitives use a `render` prop for composition instead of Radix's `asChild` — used throughout (`Button`, `DropdownMenuTrigger`) accordingly.
- Bottom nav shows at most 4 items on mobile/tablet; the full nav list is always available in the desktop sidebar. This is a placeholder-shell decision, easily revisited once real IA is finalized.

**Verified**

- `next build` (Turbopack) succeeds, `tsc --noEmit` and `eslint` are clean.
- Manually driven with Playwright (headless Chromium) against `next dev`: `/th`, `/th/app`, `/th/admin`, `/en/app` all render at mobile (390px) and desktop (1280px) widths, in light and dark mode, with no console/page errors. Confirmed bottom nav + raised primary button on mobile, sidebar on desktop, working theme toggle (applies `dark` class) and language switcher (navigates `/th/app` → `/en/app` with translations swapping).

**Follow-up (same day): IBM Plex Sans Thai font**

- Swapped the default Geist Sans for `IBM_Plex_Sans_Thai` (`next/font/google`, subsets `thai` + `latin`, weights 400/500/600/700) as the app's primary UI font — covers Thai and English from one face, fitting the i18n requirement. Geist Mono kept for `--font-mono`.
- While wiring this up, found and fixed a pre-existing bug from the shadcn init scaffold: `globals.css` had `--font-sans: var(--font-sans)` (a self-reference to an undefined variable), so the previously-loaded Geist Sans font was never actually applied — the app was silently falling back to the browser default serif font. Now `--font-sans` points at the loaded font's CSS variable correctly. Verified via computed `font-family` in a headless browser and a screenshot of Thai body text.

**Follow-up (same day): suppress next-themes script-tag dev warning**

- Fixed a bug report: switching language triggered a console error — "Encountered a script tag while rendering React component" — sometimes paired with React's generic hydration-mismatch boilerplate text.
- Root cause (confirmed via reproduction + upstream issue research, not guessed): `next-themes` injects its FOUC-prevention `<script>` via `React.createElement`. React 19.2's client renderer dev-warns whenever that script tag participates in *any* client-side re-render — which happens here because `<html>`/`<body>` live in `src/app/[locale]/layout.tsx` (the standard next-intl pattern), so switching locale re-renders that whole root layout, including the theme script. This is a known, unresolved upstream issue affecting any `next-themes` + React 19.2 app (see [pacocoursey/next-themes#387](https://github.com/pacocoursey/next-themes/issues/387), [shadcn-ui/ui#10104](https://github.com/shadcn-ui/ui/issues/10104)) — it is a dev-only false positive: the script still runs correctly via SSR, the theme still applies. Reproduced with headless-browser checks before and after the fix; no visible breakage in either case, dark mode and locale switching both worked throughout.
- Applied the community-recommended workaround in `src/components/theme-provider.tsx`: filter this exact console.error message in development only. Re-verified: warning gone, `next build` / `tsc` / `eslint` all still clean, full breakpoint/theme/locale check still passes with zero console errors.

**Open items / not built yet**

- LINE Messaging API integration (webhook, push/reply) — later step.
- Auth logic (Supabase Auth, role-based access for owner/agent/analyst) — later step.
- Database schema, RLS policies, multi-tenancy (`organization_id` scoping) — later step.
- No Supabase project is actually provisioned; `.env.local` is not created (only the `.example` template).
- **Environment blocker**: `git` is non-functional in this shell — Xcode license not yet accepted (`sudo xcodebuild -license`). This blocked the `@next/codemod` middleware→proxy migration tool (renamed the file by hand instead) and blocks any `git status`/`git diff` checks on my end. The user will need to run `sudo xcodebuild -license` locally before their usual `git add`/`git commit` will work.
