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
- Database schema, RLS policies, multi-tenancy (`organization_id` scoping) — done, see 2026-09-17 Phase 1 Step 2 entry below.
- No Supabase project is actually provisioned; `.env.local` is not created (only the `.example` template).
- **Unresolved user report**: a "Hydration failed because the server rendered HTML didn't match the client" error was reported after the script-tag fix above. Could not reproduce across ~15 scenarios in headless Chromium (cold loads of every route, light/dark system preference, theme toggle, language switch, combined flows, root-path redirect, back/forward nav) — all clean, no errors. Most likely stale Fast Refresh state from the several file edits made during that session, or a browser extension; asked the user to hard-refresh / test in an incognito window and, if it recurs, share the full error with its component stack trace. No code change was made for this since it isn't reproducible — revisit if the user reports it again with more detail.
- **Environment blocker**: `git` is non-functional in this shell — Xcode license not yet accepted (`sudo xcodebuild -license`). This blocked the `@next/codemod` middleware→proxy migration tool (renamed the file by hand instead) and blocks any `git status`/`git diff` checks on my end. The user will need to run `sudo xcodebuild -license` locally before their usual `git add`/`git commit` will work.

---

## 2026-09-17 — Phase 1, Step 2: Database schema + RLS

**What was built**

- Initialized `supabase/` (via `supabase init`): `supabase/config.toml`, `supabase/.gitignore`. No project is linked yet.
- First migration, `supabase/migrations/20260917160000_core_schema.sql`:
  - `organizations` — tenant root (`id`, `name`, `slug` unique, timestamps).
  - `profiles` — 1:1 with `auth.users`, auto-created by an `AFTER INSERT` trigger on `auth.users` (`handle_new_user`) so a user can never exist without a profile.
  - `organization_members` — join table carrying the per-organization `role` (`owner` / `agent` / `analyst` enum, `org_role`). Role lives on the membership, not the user, since the same person could hold different roles in different organizations. Creating an organization auto-inserts its creator as `owner` via an `AFTER INSERT` trigger on `organizations` (`handle_new_organization`) so an org can never exist without an owner.
  - `audit_log` — org-scoped, append-only from the client (no update/delete policy), per the Admin Panel's audit log requirement.
  - Two `SECURITY DEFINER` helper functions, `is_org_member(org_id)` / `is_org_owner(org_id)`, back nearly every RLS policy. A policy on `organization_members` that queried `organization_members` directly would recurse into its own check; routing through a `SECURITY DEFINER` function avoids that (its internal query bypasses RLS) — this is the standard Supabase pattern for the problem, not a novel workaround.
  - RLS is enabled on all four tables with policies scoped to organization membership (see the migration file for the full policy list).
- `docs/decisions/0001-multi-tenancy-and-rls.md` — ADR explaining the tenancy model, why role lives on membership not the user, the `SECURITY DEFINER` recursion-avoidance pattern, and the trigger-based bootstrapping, per CLAUDE.md's "big architecture calls" documentation rule.
- Hand-written `src/lib/supabase/database.types.ts` matching this schema, wired into both `src/lib/supabase/client.ts` and `server.ts` via `createBrowserClient<Database>()` / `createServerClient<Database>()` for typed queries. Marked to be replaced by `supabase gen types typescript` output once a real project is linked.

**Key decisions**

- Multi-tenancy is enforced at the database layer via RLS keyed on `organization_members`, not left to application-level filtering — see the ADR for the full reasoning.
- LINE channel credentials are deliberately **not** part of this schema — that's a separate table/decision when LINE integration is built, with encrypted token columns per CLAUDE.md.

**Verified**

- Migration SQL syntax-checked against the real Postgres grammar via `libpg-query` (parsed all 35 statements with no errors).
- `next build`, `tsc --noEmit`, and `eslint` all clean with the new `Database` type wired into both Supabase client helpers.

**Follow-up (same day): applied to a real Supabase project, found and fixed a real bug**

- User created a real Supabase project and filled in `.env.local`. Decided to apply migrations by pasting the `.sql` file contents into the dashboard's **SQL Editor** rather than using the CLI (`supabase link` / `db push`) — noted as the ongoing workflow for future migrations too, since the CLI's browser-based login can't complete from this non-interactive shell anyway.
- `20260917160000_core_schema.sql` applied successfully ("Success. No rows returned").
- Wrote a throwaway verification script (`@supabase/supabase-js`, using the service role + anon keys from `.env.local`, never printed) to actually check the live database rather than trust the dashboard's success message alone. First run confirmed all 4 tables exist and are queryable.
- **Bug found by that test, not by inspection**: inserting a row into `organizations` via the **service role key** failed with `null value in column "user_id" ... violates not-null constraint`. Root cause: `handle_new_organization()` always tried to add the inserting user as owner using `auth.uid()`, but `auth.uid()` is `NULL` for service-role-driven inserts (no session attached) — e.g. any future backend/admin script or seed script. The trigger's failed insert rolled back the whole `organizations` insert.
- Fixed in `20260917170000_fix_org_owner_trigger_service_role.sql`: the trigger now only auto-adds the owner when `auth.uid()` is not null; service-role callers must insert the owner membership themselves. Applied via SQL Editor, re-verified: service-role insert now succeeds, and a second test (insert a row via service role, confirm the anon key gets zero rows back, then delete the test row) confirmed RLS actually blocks anonymous access — not just "the table has no data anyway."
- Database is confirmed clean after testing (test rows inserted and deleted programmatically, nothing left behind).

**Open items / not built yet**

- Auth UI/flows that actually create organizations and invite members (this step only built the schema + triggers that make that safe, not the screens or server actions).
- LINE channel credentials table (channel ID/secret/access token, encrypted) — later step, once LINE integration starts.
- Regenerate `src/lib/supabase/database.types.ts` from the live project (`supabase gen types typescript --project-id <ref>`) to replace the hand-written version — not done yet since CLI isn't linked (project uses SQL Editor workflow instead).
