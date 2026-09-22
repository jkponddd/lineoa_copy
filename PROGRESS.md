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

- LINE channel credentials table (channel ID/secret/access token, encrypted) — later step, once LINE integration starts.
- Regenerate `src/lib/supabase/database.types.ts` from the live project (`supabase gen types typescript --project-id <ref>`) to replace the hand-written version — not done yet since CLI isn't linked (project uses SQL Editor workflow instead).

---

## 2026-09-17 — Phase 1, Step 3: Auth (email/password, route protection, first-org onboarding)

**What was built** (scope confirmed with user beforehand: email+password, route protection, org onboarding — see [0002](docs/decisions/0002-auth-approach.md) for the full reasoning)

- `src/lib/supabase/middleware.ts` — `updateSession()`, refreshes the Supabase session cookie on every request per Supabase's documented SSR pattern.
- `src/proxy.ts` rewritten to combine next-intl's locale routing with session refresh and a lightweight auth guard (session-only check, no DB query) that redirects unauthenticated requests to `/app` or `/admin` to `/login?next=<path>`.
- `src/lib/supabase/get-current-membership.ts` — server-only helper resolving the current user's profile + first organization membership + role (two flat queries, not an embedded `.select()`, since the hand-written `Database` type doesn't model relationships — see bug note below).
- Auth Server Actions (`src/app/[locale]/(auth)/actions.ts`): `login`, `signup`, `signOut`, all using `next-intl`'s locale-aware `redirect()`.
- `/login` and `/signup` pages + `LoginForm`/`SignupForm` client components (`useActionState`), under a minimal `(auth)` layout (no app shell).
- `/onboarding` — server-checked (redirects unauthenticated → `/login`, already-has-an-org → `/app`) page with `CreateOrganizationForm`, reusing the `handle_new_organization` trigger from migration 1 to auto-add the creator as owner.
- `(app)/layout.tsx` and `(admin)/layout.tsx` now do real server-side checks: no membership → `/onboarding`; **Admin Panel is owner-only** — non-owners hitting `/admin` are redirected to `/app`.
- `AppShell` now takes a `user` prop and renders a real `UserMenu` (avatar, name/email, org name, sign-out) instead of the earlier placeholder header.
- Marketing homepage's CTA now links to `/signup`.
- New shadcn components: `input`, `label`, `card`. New dependency: `server-only`.
- `docs/decisions/0002-auth-approach.md`.

**Bugs found and fixed while building/testing this (not by inspection — by actually exercising the flow against the live Supabase project)**

1. **Double locale-prefixed redirect** (`/th/th/app` → 404): `proxy.ts` was storing the post-login `next` target with the locale prefix still attached (`/th/app`), then handing it to next-intl's `redirect()`, which prepends the locale itself. Fixed by stripping the locale before storing `next`.
2. **`DropdownMenuLabel` crash in `UserMenu`**: "Base UI: MenuGroupContext is missing." Base UI's `Menu.GroupLabel` (unlike Radix's) must be nested inside `Menu.Group`. Fixed by wrapping it in `DropdownMenuGroup`.
3. **Missing `nativeButton={false}`** on two more `Button` + `render={<Link/>}` composites (the marketing CTA, after wiring it to `/signup`) — same class of issue as the sidebar fix from the scaffold step; same fix.
4. **Hand-written `Database` type was silently making every Supabase query resolve to `never`**: `@supabase/postgrest-js` requires `Relationships` on every table and `Views`/`Functions` on the schema to type `.select()` correctly — the hand-written type from Step 2 was missing all three, which doesn't error at the type definition site, it just makes query results untyped. Fixed by adding the required (empty) fields.
5. **TypeScript didn't narrow types after `redirect()` guard clauses**, despite `redirect()` being typed `() => never` — confirmed via isolated repro that this specific case (a `never`-returning function returned from `createNavigation()`, a generic factory) doesn't narrow the way a plain `function f(): never` does. Worked around with explicit `return null;` after every such guard clause — see the ADR for detail.

**Verified — actually exercised against the live Supabase project, not just built and assumed working**

Used the service-role key to create real (pre-confirmed) test users via the admin API, then drove the full flow with a headless browser:
- Unauthenticated visit to `/app` → redirected to `/login?next=%2Fapp`.
- Log in → lands on `/onboarding` (no org yet) → create org → lands on `/app`, org + owner membership rows confirmed in the database.
- Visit `/admin` as the owner → allowed.
- A second user added as `agent` (not owner) to the same org → visits `/admin` → bounced to `/app`.
- Sign out → back to `/login`; `/app` afterward → redirected to `/login` again (session actually cleared, not just UI state).
- Public signup form (via the marketing page's CTA) → shows the "confirm your email" message, confirming the project has email confirmation enabled and the app handles that state correctly rather than assuming an immediate session.
- Zero console/page errors in the final passing run.
- All test users, organizations, and memberships created during testing were deleted afterward via the service role key — confirmed the database is back to empty (`organizations: 0`, `organization_members: 0`, `auth users: 0`).
- `next build`, `tsc --noEmit`, `eslint` all clean.

**Open items / not built yet**

- Org-switcher UI for users belonging to multiple organizations (schema supports it; `getCurrentMembership()` just picks the first row for now).
- Password reset / forgot-password flow.
- Inviting other members to an organization (schema + RLS support it — `organization_members` insert is owner-gated — but there's no UI/action for it yet).
- Per-feature permission checks within `/app` for agent vs. analyst (today's role split is only the coarse owner-vs-everyone-else gate on `/admin`).
- Regenerate `database.types.ts` from the live project once the CLI is linked (still using the SQL-Editor workflow, so this hasn't happened).

---

## 2026-09-17 — Phase 1, Step 4 (part 1): LINE channel credential storage + connect-channel UI

User has no real LINE Official Account yet, so this step is split: build and fully verify everything that doesn't need live LINE credentials (schema, encrypted storage, admin UI, signature-verification logic), and clearly flag what's still unverified until a real channel exists (the webhook receiver end-to-end, actually sending a message).

**What was built**

- `supabase/migrations/20260917180000_line_channels.sql` — `line_channels` table (org-scoped, RLS). Channel secret and access token are **never plaintext columns** — they're stored via **Supabase Vault** (`vault.create_secret`/`vault.decrypted_secrets`), and `line_channels` only holds foreign keys into `vault.secrets`. Chosen over hand-rolled `pgcrypto` encryption because it's the Supabase-native tool for exactly this, with key management handled by Supabase rather than us.
  - `create_line_channel(...)` — owner-only (re-checks `is_org_owner()` itself, SECURITY DEFINER), the only way to insert a row.
  - `get_line_channel_secrets(...)` — decrypts and returns both secrets. **`service_role` only** — `authenticated` and `anon` are explicitly revoked, so not even an organization's own owner can call this and get plaintext secrets back through their normal session. Only trusted server-side code with the service role key can ever see a decrypted value.
  - `delete_line_channel(...)` — owner-only, cleans up the Vault rows too.
  - `docs/decisions/0003-line-credential-storage.md` — full reasoning.
- **Bug caught before any webhook code was written** (by checking LINE's actual docs, not assuming from memory): LINE's webhook request body never contains the numeric Channel ID from the Developers Console — it contains a `destination` field, which is the bot's own user ID, specifically documented by LINE for "which of my channels is this webhook for." Fixed in a same-day follow-up migration, `20260917190000_line_channels_bot_user_id.sql`, adding a `bot_user_id` column (unique, fetched via LINE's "Get bot info" API at connect time) and `get_line_channel_secrets_by_bot_user_id(...)` for the actual webhook-routing lookup path.
- `src/lib/supabase/service-role.ts` — new client helper for the service-role-only privileged operations above (webhook handler, push sender, once built).
- `src/lib/line/verify-signature.ts` — LINE webhook signature verification (HMAC-SHA256 of the raw body using the channel secret, compared to the `x-line-signature` header, per LINE's documented scheme).
- `src/lib/line/get-bot-info.ts` — calls LINE's `GET /v2/bot/info`; used at connect-time to fetch `bot_user_id` and to validate the pasted access token actually works before anything is stored.
- Admin UI: `/admin/line-channels` — list of connected channels (metadata only) + a sheet-based "connect a channel" form (`ConnectLineChannelSheet`) + `DisconnectLineChannelButton`. New nav item across both mobile and desktop shells.
- `database.types.ts` extended with `line_channels` and the three RPC function signatures.

**Verified against the live database and live LINE API (not just written and assumed correct)**

- Both migrations syntax-checked via `libpg-query` before being run.
- Full RLS/authorization matrix tested with real accounts (owner/agent from the auth step) via the JS client, using fake channel credentials: non-owner blocked from creating a channel (PASS), owner can create one (PASS), the secret never appears in the plaintext `line_channels` row (PASS), a member (non-owner) can see channel *metadata* (PASS), an **owner's own authenticated session is blocked** from calling `get_line_channel_secrets` (PASS — permission denied, confirms the service-role-only design actually holds), `service_role` decrypts correctly (PASS), an anonymous request sees zero rows (PASS), deletion removes the row (PASS).
- Same matrix re-run after the `bot_user_id` fix: webhook-routing lookup (`get_line_channel_secrets_by_bot_user_id`) returns the right channel and decrypts correctly (PASS), still blocked for non-service-role callers (PASS), `bot_user_id` uniqueness enforced (PASS).
- `getLineBotInfo()` cross-checked against LINE's real, live API with an invalid token — confirmed it returns 401 and the function's error path handles that correctly. (The success path — a real token — is not verified; no real channel exists yet.)
- `verifyLineSignature()` cross-checked against an independently-computed HMAC (not just re-running the same code): valid signature accepted, tampered body rejected, wrong secret rejected, missing/garbage header rejected, empty-body edge case correct.
- Admin UI driven end-to-end with a headless browser against the live app + database: empty state renders, connect sheet submits and correctly surfaces "invalid token" for a fake token (real LINE API rejection, not a stub), a channel seeded directly via the RPC shows up correctly in the list, an agent (non-owner) hitting `/admin/line-channels` directly is still bounced to `/app` (confirms the layout-level guard covers new admin routes automatically, no per-page auth code needed), disconnect removes it from both the UI and the database. All test data cleaned up afterward — confirmed zero `line_channels` rows left over.
- `next build`, `tsc --noEmit`, `eslint` all clean.

**Not verified — genuinely can't be, without a real LINE channel**

- The webhook route handler itself hasn't been built yet (next part of this step).
- Nothing has been tested against a real LINE webhook delivery or a real push/reply API call — that needs the user to actually create a LINE Official Account (guided through this in conversation) and connect it through the new admin UI.

**Open items / not built yet**

- Push/reply message sending (LINE's REST API).
- Regenerate `database.types.ts` from the live project once the CLI is linked (still using the SQL-Editor workflow, so this hasn't happened).

---

## 2026-09-18 — Phase 1, Step 4 (part 2): LINE webhook route handler

**What was built**

- `src/app/api/line/webhook/route.ts` — POST handler, not under `src/app/[locale]/` since LINE calls it directly (no locale/UI concerns). Flow: read raw body text (signature verification needs the exact bytes, not a `JSON.parse`/`JSON.stringify` round-trip) → extract `destination` → look up the channel via `get_line_channel_secrets_by_bot_user_id` (service role) → verify `x-line-signature` against the found channel's secret → acknowledge. Unrecognized `destination` → 200 (nothing to act on, and returning non-200 would just make LINE retry pointlessly). Bad/missing signature → 401. Malformed body → 400.
- `src/lib/line/types.ts` — deliberately loose `LineWebhookEvent`/`LineWebhookBody` types (just enough to log/route what arrives; full per-event-type modeling belongs with the Inbox feature that will actually consume these events, not the webhook receiver).
- Event *processing* (persisting messages, auto-reply, an actual inbox) is explicitly out of scope for this step — the handler verifies and acknowledges, and logs what it received. Building that out is its own future step once Inbox is scoped.

**Verified against the live dev server + live database (real HTTP requests, not simulated)**

Seeded a real test channel (via the owner account + `create_line_channel`) with a known secret, computed real HMAC-SHA256 signatures, and sent actual POST requests to the running server:
1. Correctly-signed request → 200 (PASS)
2. Wrong signature → 401 (PASS)
3. Missing signature header → 401 (PASS)
4. Signature valid for the body but destination doesn't match any of our channels → 200, silent ack (PASS)
5. Malformed JSON body → 400 (PASS)
6. Body tampered after signing (signature no longer matches) → 401 (PASS)
7. Cleaned up the test channel afterward.

`next build`, `tsc --noEmit`, `eslint` all clean.

**Resolved: the "Hydration failed" bug reported earlier, still open in PROGRESS.md as unreproducible**

Root cause found by accident while grepping the dev server log during this step's testing — the full React error (previously only seen truncated) shows the actual DOM diff:

```
<div
+   className="flex min-h-svh"
-   className={null}
-   id="island-alerts-shadow-root"
-   style={{all:"initial"}}
>
```

`island-alerts-shadow-root` is not anything in this codebase — it's injected by a third-party browser extension/security product (consistent with "Island," an enterprise browser security tool that wraps pages in a shadow-root overlay) into the user's own browser tab, ahead of React's hydration. This is exactly the "browser extension modifies the DOM before hydration" cause flagged as the leading hypothesis when this was first reported and couldn't be reproduced in a clean headless-browser session. **Not an app bug** — confirmed by every functional test throughout this whole session showing zero actual breakage; React recovers by re-rendering the affected subtree client-side. Nothing to fix in the codebase. Closing this out; revisit only if it starts causing a *visible* problem (not just a console warning) in the user's actual browser.

**Open items / not built yet**

- Inbox feature (persisting/displaying received messages) — the webhook handler acknowledges and logs events but doesn't store them anywhere yet; that's its own scoping decision.
- Regenerate `database.types.ts` from the live project once the CLI is linked (still using the SQL-Editor workflow, so this hasn't happened).

---

## 2026-09-18 — Phase 1, Step 4 (part 3): LINE push/reply message sending

**What was built**

- `src/lib/line/send-message.ts` — `replyMessage(channelAccessToken, replyToken, messages)` and `pushMessage(channelAccessToken, to, messages)`, thin wrappers around LINE's `POST /v2/bot/message/reply` and `/push`. Both take the access token as a plain argument rather than looking it up themselves — keeps the LINE API call pure and testable, separate from the Supabase lookup.
- `src/lib/line/get-channel-access-token.ts` — the one place in the app allowed to call `get_line_channel_secrets` (service-role-only at the DB level) to fetch a channel's token for sending.
- `LineTextMessage`/`LineMessage` types added to `src/lib/line/types.ts` — text typed explicitly, other message kinds (image, flex, template) left as a loose fallback until a feature actually needs them.
- Deliberately **not wired into any product behavior yet** (no auto-reply in the webhook handler, no broadcast UI) — that's a product decision (what should the bot actually say/do) separate from "can we call LINE's send API correctly," which is what this step covers.

**Verified against LINE's real, live API** (request shape confirmed against LINE's docs before writing, not from memory alone — see sources in the conversation) — both endpoints reachable, both return the expected `401` + error body for an invalid token, confirmed both via `curl` directly and via a standalone run of the actual function logic. The success path (a real token, a real message actually delivered) is **not verified** — no real LINE channel exists yet.

`next build`, `tsc --noEmit`, `eslint` all clean.

**Open items / not built yet**

- Inbox feature (persisting/displaying received messages, and actually using `replyMessage`/`pushMessage` from a real feature) — the webhook handler acknowledges and logs events but doesn't store them anywhere yet; that's its own scoping decision.
- Regenerate `database.types.ts` from the live project once the CLI is linked (still using the SQL-Editor workflow, so this hasn't happened).

---

## 2026-09-21 — Phase 1, Step 5: Password reset

**What was built**

- `src/app/auth/confirm/route.ts` — GET Route Handler, not under `src/app/[locale]/` (it's an email-link target with its own `token_hash`/`type`/`next`, no locale of its own). Exchanges the one-time token for a real session via `supabase.auth.verifyOtp({type, token_hash})`, then redirects to `next` — which is the full destination URL, not a bare path (see below). Falls back to `/login?error=linkExpired` if verification fails.
- `requestPasswordReset` / `updatePassword` actions added to `(auth)/actions.ts`. `requestPasswordReset` calls `resetPasswordForEmail(email, {redirectTo})` — deliberately returns the same "check your email" response whether or not the address is registered (Supabase's own anti-enumeration behavior; the UI doesn't undermine it by branching on the result).
- `/forgot-password` and `/reset-password` pages + forms. `/reset-password` checks server-side for a session (only reachable by way of `/auth/confirm` actually verifying a token) and bounces to `/login` otherwise.
- "Forgot password?" link added to the login form; login page shows a message when arriving via an expired/invalid reset link (`?error=linkExpired`).

**Bugs found and fixed by testing, not by inspection**

1. **`/auth/confirm` was being redirected to `/th/auth/confirm` by our own middleware** — `proxy.ts`'s matcher ran next-intl's locale routing over every path except `api`/`trpc`/`_next`/`_vercel`, and `/auth/confirm` didn't match any of those, so it got silently locale-prefixed to a URL nothing serves. Caught by the very first attempt to actually drive the flow through a browser (curl/unit-level checks wouldn't have caught this — it's specifically a middleware-routing interaction). Fixed by adding `auth` to the matcher's exclusion list, same treatment as `api`.
2. **Initial design mistake, caught before writing the route handler** (research first, this time): almost built the email template link as `/auth/confirm?next=/reset-password` with a hardcoded path, matching Supabase's basic docs example literally. Re-checked and confirmed `{{ .RedirectTo }}` exists as a template variable reflecting whatever `redirectTo` was passed to `resetPasswordForEmail()` at call time — switched to that, so `next` carries the correct locale-specific destination (e.g. `/th/reset-password` vs `/en/reset-password`) dynamically instead of a hardcoded, non-locale-aware path.

**Verified against the live database and a live dev server — the full loop, not just pieces**

Used `supabase.auth.admin.generateLink({type: 'recovery', email})` to get a real `hashed_token` for the `owner@example.com` test account without needing to receive an actual email, then drove the whole thing through a browser exactly as a real user would:
1. Visiting the `/auth/confirm?token_hash=...&type=recovery&next=...` link lands on `/th/reset-password` (PASS, after the middleware fix above).
2. Submitting a new password redirects to `/th/app` (PASS).
3. Signing out and logging back in with the **new** password succeeds (PASS — confirms the password was actually changed in Supabase, not just that the form submitted without error).
4. An invalid/tampered `token_hash` correctly bounces to `/login?error=linkExpired` with the right message shown (PASS).
5. Afterward, reset `owner@example.com`'s password back to the documented `Owner@123456` via the admin API and re-verified login still works — the credentials given to the user earlier in this project remain valid.

`next build`, `tsc --noEmit`, `eslint` all clean.

**Manual step still needed from the user — not something I can do via SQL Editor or the service role key**

The **"Reset Password" email template** in the Supabase dashboard (Authentication → Email Templates) needs to be updated so the link it sends actually points through our `/auth/confirm` route instead of Supabase's default hosted confirmation page:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}">Reset password</a>
```
Everything above was verified mechanically correct using `generateLink()` to bypass needing a real email — but the actual "Forgot password?" button in the running app won't work end-to-end for a real user until this template is updated, since email templates aren't something the service role key or SQL Editor can touch.

**Open items / not built yet**

- The "Reset Password" email template update above (user needs to do this in the dashboard) — **still pending**, user chose to defer it and work on something else instead.
- Whether to also switch the "Confirm signup" email template to the same `/auth/confirm` pattern — left alone for now to avoid touching a flow that wasn't the target of this step; worth doing for consistency later.
- Inbox feature (persisting/displaying received messages, and actually using `replyMessage`/`pushMessage` from a real feature).
- Regenerate `database.types.ts` from the live project once the CLI is linked (still using the SQL-Editor workflow, so this hasn't happened).

---

## 2026-09-21 (continued) — Phase 1, Step 6: Admin Panel — organization user/role management

Scope confirmed with user beforehand: manage members of the *current* org only (view, change role, remove), and add a member **by email for an account that already exists** — not a full email-invite flow (send invite → recipient signs up → auto-joins) for people without accounts yet. That's a meaningfully bigger feature (its own table, its own email template) and was explicitly scoped out for this step.

**What was built**

- Two new migrations, both applied and verified live:
  - `20260921000000_org_member_management.sql` — `get_user_id_by_email(email)` (SECURITY DEFINER, `authenticated`-only; resolves an email to a user id so the client can add an existing account to the org — `auth.users` isn't PostgREST-exposed, so there was no way to do this without it). Also a `prevent_last_owner_removal` trigger on `organization_members` (`BEFORE UPDATE OR DELETE`) — an organization with zero owners is an invalid state (nobody could manage it again, every owner-gated action requires `is_org_owner()`), enforced at the trigger level so it holds no matter which code path touches the table, not just the UI.
  - `20260921010000_get_organization_members.sql` — `get_organization_members(org_id)`, another SECURITY DEFINER function joining `organization_members` + `auth.users` + `profiles`, because the members list needs to *show* email too and the same auth.users-isn't-exposed gap applied there. Deliberately didn't denormalize email into `profiles` (would need its own sync trigger for Supabase's email-change flow) — `auth.users` stays the single source of truth.
- `/admin/users` page: member table (email, name, role, joined date) + `AddMemberSheet` (email + role) + inline `MemberRoleSelect` (role dropdown, changes immediately on select) + `RemoveMemberButton` (with a confirm dialog). New nav item.
- Added shadcn `select`, `table`, `badge` components.

**Bug found and fixed during this step, not by inspection**

`<Select.Value />` (Base UI) renders the **raw stored value** by default (`owner`, `agent`, `analyst`) rather than the matching `<Select.Item>`'s label — caught by actually looking at a screenshot of the running page, not by reading the component code. Fixed by passing a children render function (`{(value) => roleLabels[value]}`) in both `AddMemberSheet` and `MemberRoleSelect`, per Base UI's documented `Select.Value` API (`children?: ReactNode | ((value) => ReactNode)`).

**Verified against the live database and a live dev server**

- Both migrations syntax-checked via `libpg-query` before being run.
- `get_user_id_by_email`: finds an existing user (PASS), returns `null` for an unknown email (PASS).
- Last-owner safeguard tested directly against the DB with the real owner/agent test accounts: deleting the sole owner blocked (PASS), demoting the sole owner via update blocked (PASS), DB state unchanged after both blocked attempts (PASS), then — with a second owner temporarily promoted — demoting the original owner succeeded (PASS), confirming the check is specifically "last owner," not "owner, ever." Test accounts' roles restored to their documented values afterward and re-verified.
- `get_organization_members`: owner sees all 3 members with correct emails (PASS); an anonymous (no session) call is flatly rejected — `permission denied for function` — rather than returning data (PASS).
- Full UI flow driven with a headless browser against the live app: member list renders correctly; adding a nonexistent email shows the right error; adding a real, previously-unaffiliated user succeeds and appears in the list; adding that same email again correctly says "already a member"; changing a member's role via the dropdown actually updates the database (confirmed by querying it directly, not just that the UI didn't show an error); removing a member actually removes them; an agent (non-owner) hitting `/admin/users` directly still bounces to `/app` (the existing layout-level guard covers this new route automatically, same as it did for `/admin/line-channels`). All test data (the temporary "New Member" account) cleaned up afterward — confirmed back to exactly the 3 documented test accounts with their original roles.
- `next build`, `tsc --noEmit`, `eslint` all clean.

**Open items / not built yet**

- Full invite-by-email flow for people without an existing account (would need an `organization_invites` table, an email template, and an accept-invite flow) — explicitly out of scope for this step, noted here in case it's wanted later.
- The "Reset Password" email template update from the previous step — still pending on the user.
- Inbox feature.
- Regenerate `database.types.ts` from the live project once the CLI is linked.

---

## 2026-09-22 — Phase 1, Step 7: Inbox (view/reply to LINE messages)

Scope confirmed via AskUserQuestion first (per CLAUDE.md rule 3, since this spans DB schema + webhook + realtime + storage): full conversation history (not just latest-in), text + image messages, assignment to an agent from day one. See [[0004-inbox-schema]] for the schema reasoning.

**What was built**

- Two new migrations, applied and verified live:
  - `20260922000000_inbox.sql` — `conversations` + `messages` tables, both RLS-protected and `organization_id`-scoped; `assign_conversation`, `record_outbound_message`, `upsert_conversation_for_webhook`, `insert_inbound_message` (SECURITY DEFINER functions — no direct table writes from any client, same pattern as `line_channels`); a `touch_conversation_on_message` trigger keeps `conversations.last_message_at` in sync for list sorting; adds both tables to the `supabase_realtime` publication.
  - `20260922010000_line_media_storage.sql` — private `line-media` Storage bucket + RLS policies scoped by the `{organization_id}/...` path prefix (via `storage.foldername`), reusing `is_org_member()`.
- LINE API helpers: `get-profile.ts` (fetch a LINE user's display name/picture for a new conversation), `get-message-content.ts` (download inbound image bytes from LINE's Content API — note the different `api-data.line.me` host).
- Webhook handler (`src/app/api/line/webhook/route.ts`) now actually processes `message` events (text/image only — other subtypes silently skipped for now): upserts the conversation, downloads+stores image bytes for image messages, inserts the message row. Previously it only verified and logged.
- Inbox UI under `(app)/app/inbox/`:
  - `page.tsx` — conversation list, sorted by `last_message_at`, with a last-message preview and an assignee badge.
  - `[conversationId]/page.tsx` — thread view: header (avatar, name, back button on mobile, `AssignSelect`), scrollable message history (`MessageThread`, auto-scrolls to newest), `ReplyComposer` (text + image attach, Enter to send/Shift+Enter for newline).
  - `RealtimeRefresh` client component — subscribes to `postgres_changes` on `conversations`/`messages` (via the signed-in user's own session, so RLS gates what they receive) and calls `router.refresh()`; used on both the list and thread pages instead of hand-rolled client-side state merging.
  - Outbound sends go through `pushMessage` (LINE push API — no reply token available from a UI-triggered send, since reply tokens are single-use and tied to the original webhook event) and are only recorded in the DB *after* the LINE API call succeeds.
  - Outbound images: the agent's browser uploads directly to the `line-media` bucket (covered by its own `authenticated` insert policy), then a server action generates a signed URL (service role) for LINE to fetch the image from and pushes it.
  - `/app` now redirects to `/app/inbox` (was a placeholder page; the nav's primary action already pointed at `/app/inbox`).
- Added shadcn `textarea`, `scroll-area` components.
- New `inbox` translation namespace in both `th.json`/`en.json`.

**Bug found and fixed during this step, not by inspection**

The inbox list's assignee `Badge` clipped its text from the wrong side with no ellipsis on mobile (e.g. `agent@example.com` rendered as `ent@example.co`), caught by actually looking at a mobile screenshot, not by reading the component. Root cause: `Badge` is `inline-flex ... justify-center`, and CSS `text-overflow: ellipsis` doesn't produce a trailing "…" on a flex container with centered content — instead the centering just clips both ends symmetrically once the fixed-width parent's content overflows. Fixed by moving `truncate` onto a plain `<span>` child instead of the flex `Badge` itself, so the ellipsis logic runs on ordinary block-level text truncation. Also shortened the list row's timestamp from a full date+time to just time (`toLocaleTimeString`) and gave the display name its own full-width line — the original three-way flex row (name / full date / badge) left almost no room for the name on a 390px screen even before the badge bug.

**Verified against the live database and a live dev server**

- Both migrations applied via SQL Editor, no errors.
- A Node script using the service-role key, plus a real signed webhook POST against the running dev server (HMAC-SHA256 over a fake channel secret, same as LINE would send), exercised the whole path end to end: conversation + inbound message correctly persisted with the right `organization_id` (PASS); a retried webhook delivery (same `line_message_id`) does not create a duplicate (PASS); a bad signature is rejected with 401 (PASS); the organization's own member can `select` the conversation via RLS, an anonymous session sees zero rows (PASS); `assign_conversation` succeeds for an in-org agent, succeeds for unassigning, and is rejected for a user who isn't a member of the organization (PASS); `record_outbound_message` succeeds and the `last_message_at` trigger stays in sync (PASS); Storage — the owner can upload under their own `{organization_id}/...` path and generate a signed URL, an anonymous session cannot list that org's media, and uploading under a *different* organization's path is rejected by RLS (PASS, all of it).
- Full UI flow driven with a headless browser (logged in as the real `owner@example.com` test account): the inbox list shows a seeded conversation's preview text and last-message time; opening it shows the full message history; the assign dropdown successfully reassigns to the agent test account (confirmed persisted across a second, separate browser session); attempting to send a text reply fails gracefully with the expected on-screen error (there's no real LINE channel behind the test channel's fake access token, so the actual push call to LINE's API correctly fails rather than the page crashing); mobile viewport shows the back-to-list button and bottom nav; dark mode renders correctly with no hardcoded colors. Zero unexpected browser console/page errors across all sessions.
- All seeded test data (fake LINE channel, conversation, messages, uploaded storage object) cleaned up afterward and confirmed gone.
- What's still **not** verified: an actual image message arriving from a real LINE user (the webhook's image-download path was exercised in code review but not with real LINE-hosted image bytes), and an outbound reply actually reaching a real LINE client — both need a real connected LINE Official Account, same caveat as the webhook step itself.
- `next build`, `tsc --noEmit`, `eslint` all clean (re-checked after the badge fix too).

**Open items / not built yet**

- Conversation `status` (open/closed) has a column + enum but no UI to change it yet.
- Message types beyond text/image (video, audio, file, sticker, location) arrive through the webhook but are currently silently ignored.
- Read/delivery receipts.
- Real end-to-end verification (image messages, outbound push) once a real LINE Official Account is connected.
- Full invite-by-email flow, email template update, `database.types.ts` regeneration — carried over from the previous step.
