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

- Message types beyond text/image (video, audio, file, sticker, location) arrive through the webhook but are currently silently ignored.
- Read/delivery receipts.
- Real end-to-end verification (image messages, outbound push) once a real LINE Official Account is connected.
- Full invite-by-email flow, email template update, `database.types.ts` regeneration — carried over from the previous step.

**Follow-up (same day): conversation status (open/closed) UI**

No new migration needed — `conversations.status` and the `conversation_status` enum already existed from the Inbox migration above, and the existing "Members can update their organization's conversations" RLS policy already covered a plain status update, so `updateConversationStatusAction` is a direct `.update()` call rather than another SECURITY DEFINER function (unlike `assign_conversation`, there's no cross-row check needed here).

- `StatusToggle` client component in the thread header — toggles between "ปิดบทสนทนา"/"เปิดใหม่" (close/reopen).
- `ThreadHeader` restructured into two rows (name row, then assign+status row) — the original single-row layout had no room left once a second control was added on a 390px mobile viewport.
- Inbox list: closed conversations render at reduced opacity with a small "ปิดแล้ว" badge next to the name.
- Verified live: toggling closed/reopen actually persists and the button label flips; the list reflects the closed badge; checked at both desktop and mobile widths; `next build`/`tsc`/`eslint` clean; test data seeded and cleaned up the same way as the main Inbox verification.

---

## 2026-09-22 (continued) — Phase 1, Step 8: Audit Log

Scope picked via AskUserQuestion from the remaining open items (Audit Log / Broadcast / Reports / Settings) — chosen for being the smallest, most contained: `audit_log` and its RLS already existed from Step 2, nothing had ever written to it yet.

**What was built**

- One new migration, applied and verified live: `20260922020000_audit_log_read.sql` — `get_audit_log(organization_id, limit)`, a SECURITY DEFINER function joining `auth.users`/`profiles` for the actor's email/name, gated identically to `get_organization_members` (`where is_org_member(...) and organization_id = ...`, `authenticated`-only). No new write path was needed — the existing "Org members can write audit entries" RLS policy from Step 2 already covers a plain `.insert()`.
- `src/lib/audit/log.ts` — `logAuditEvent()`, a thin best-effort insert helper (a failed audit write doesn't roll back or surface an error for the action that already succeeded).
- Wired into the four existing admin actions that change organization state: `member.added` / `member.role_changed` / `member.removed` (`admin/users/actions.ts`) and `line_channel.connected` / `line_channel.disconnected` (`admin/line-channels/actions.ts`). `target` is a human-readable label (email, channel display name) resolved *before* any delete happens — resolving it after would find nothing, since the row is already gone.
- `/admin/audit-log` page — table of time / actor / action (translated label) / target, newest first. Nav item already existed from the Step 1 scaffold.
- New `auditLog` translation namespace in both `th.json`/`en.json`, including one label per action type.

**Verified against the live database and a live dev server**

- Migration applied via SQL Editor, no errors.
- Service-role + owner-session script: an org member can insert an audit_log row for their own org and `get_audit_log` returns it with the actor's email correctly resolved (PASS); an anonymous session calling `get_audit_log` is rejected with "permission denied," not just empty (PASS, grant-level block); an authenticated session querying a *different* organization's id sees zero rows without erroring (PASS, RLS-style isolation via the same `is_org_member` pattern as `get_organization_members`).
- Full real UI flow: added a genuine temporary auth account as a member through the actual `/admin/users` UI, removed them again, and disconnected a LINE channel (seeded via RPC directly, since actually *connecting* one through the UI needs a real LINE access token — same caveat as the Inbox step) through the actual `/admin/line-channels` UI. `/admin/audit-log` correctly showed all four resulting entries with the right action label, actor, and target. (Two of the test script's own assertions about the users/channels list — not the audit log itself — initially reported false failures from a Playwright dialog-listener timing bug in the *test script*, not the app; cross-checked directly against the database that the member was actually removed and the channel actually disconnected, confirming the app worked correctly and the script's checks were the only thing wrong.)
- Checked at both desktop and mobile widths. The table scrolls horizontally on a 390px viewport rather than wrapping — confirmed via `scrollWidth`/`clientWidth` that it's genuinely swipeable, not actually cut off. This is the same existing `Table` component's behavior already used on `/admin/users`, not something new introduced here, so left as-is rather than redesigning it as part of this step.
- `next build`, `tsc --noEmit`, `eslint` all clean. All test data (temp auth account, temp LINE channel, synthetic audit_log rows) cleaned up afterward; confirmed the three documented test accounts are back to their correct roles and `conversations`/`audit_log` are both empty again.

**Open items / not built yet**

- The audit log table's mobile layout (horizontal scroll, no stacked-card alternative) — pre-existing pattern, not addressed here.
- No pagination/filtering on the audit log yet (capped at the RPC's `p_limit` default of 200 rows).
- Everything carried over from Steps 6–7 (message types beyond text/image, email template, invite-by-email, `database.types.ts` regeneration, real LINE OA verification).

---

## 2026-09-22 (continued) — Phase 1, Step 9: Organization Settings (name + logo)

Scope picked via AskUserQuestion from the remaining big items (Broadcast / Reports / Settings) — chosen as the smallest and most contained. Uses the `/admin/organization` nav item that already existed in the Step 1 scaffold but had no page behind it yet.

**What was built**

- `organizations.logo_url` column and a public `org-logos` Storage bucket (unlike `line-media`, public rather than signed-URL — a logo is meant to be shown widely and isn't sensitive).
- `updateOrganizationName` / `updateOrganizationLogo` server actions, both owner-gated and both logging to the audit log (`organization.renamed`, `organization.logo_updated`) — extending the Step 8 pattern to a third area of the app.
- `/admin/organization` page: `OrganizationNameForm` (name field) and `OrganizationLogoUploader` (file picker → direct browser upload to Storage → server action persists the resulting public URL).
- New `orgSettings` translation namespace; two new `auditLog` action labels for the organization events.

**Two real bugs found live, not by inspection — both fixed**

1. **RLS + `upsert: true` rejected everything, even the actual owner uploading to their own path.** The original design used a fixed `{organization_id}/logo.{ext}` path with `upsert: true` so a re-upload would overwrite the old logo, backed by an UPDATE policy mirroring `line-media`'s pattern. Verified live: the upload failed with "new row violates row-level security policy" — first suspected the UPDATE policy was missing an explicit `WITH CHECK` (migration `20260922031000`, applied, **did not fix it**), then isolated the real cause by testing a plain insert (worked) vs. `upsert: true` on a path with no existing row at all (still failed): Postgres's `INSERT ... ON CONFLICT DO UPDATE` requires an applicable UPDATE policy to be structurally satisfiable to plan the statement at all, independent of whether any row actually conflicts — not something fixable by adjusting the policy's quals. Fixed by dropping the upsert approach entirely (migration `20260922032000`): logos now use a unique filename per upload (`crypto.randomUUID()`, same convention as `line-media`), so every write is a plain INSERT — the one path already proven to work — and no UPDATE policy is needed. The tradeoff (old logo objects left orphaned in storage rather than deleted) was accepted as a reasonable simplification rather than adding a second, more complex write.
2. **Base UI console warning on rename**: "A component is changing the default value state of an uncontrolled FieldControl after being initialized." After a successful rename, the parent Server Component re-fetches and passes a new `initialName` prop into the already-mounted `OrganizationNameForm` — an uncontrolled `Input`'s `defaultValue` only applies at mount, so React just updated the prop on the same instance instead of remounting. Fixed with `key={initialName}` on the `Input`, forcing a clean remount whenever the server-confirmed name actually changes.

**Verified against the live database and a live dev server**

- All three migrations applied via SQL Editor (the original + the two live-discovered fixes above).
- Script-level: owner can rename (persists); a non-owner's rename attempt affects zero rows without erroring (RLS-blocked); owner can upload a logo and a second/replacement logo (both unique paths); a non-owner cannot upload a logo for this org; the logo is genuinely publicly readable with no auth; an owner cannot upload under an organization they don't own.
- Full real UI flow: loaded the page with the real current name; renamed it through the form and saw the save confirmation; **reloaded the page to confirm the rename actually persisted server-side**, not just optimistic client state; uploaded a real (minimal valid) PNG through the file picker; the new logo appeared, pointed at the `org-logos` public bucket, and **survived a full reload**; an agent (non-owner) hitting `/admin/organization` directly is bounced to `/app` by the existing layout guard; zero unexpected console/page errors after the `key` fix (one was caught and fixed, as above).
- Checked at desktop, mobile, and dark mode.
- `next build`, `tsc --noEmit`, `eslint` all clean.
- All test data cleaned up: organization name and logo restored to the documented `"My Organization"` / no logo; test Storage objects removed; synthetic `audit_log` rows cleared.

**Open items / not built yet**

- Old logo objects aren't deleted from Storage on replacement (accepted tradeoff, see above) — fine for now, would matter if logo changes become frequent at scale.
- No image cropping/resizing on upload — whatever the browser sends is stored as-is.
- Slug is not editable from this page (would need to think through what happens to anything keyed by the old slug first).
- Everything carried over from Steps 6–8.

---

## 2026-09-22 (continued) — Phase 1, Step 10: Reports/Analytics

Scope picked via AskUserQuestion from the last two big remaining items (Broadcast / Reports) — chosen because it reads existing Inbox data rather than needing a real LINE OA to test end-to-end. Lives at `/app/reports` (User App, not Admin — matches CLAUDE.md's product description, and the nav item/href already existed from the Step 1 scaffold).

**What was built**

- No migration — every query reads existing `conversations`/`messages` tables the signed-in member already has RLS access to, plus the existing `get_organization_members` RPC for name resolution.
- Stat tiles: total conversations, open, closed, total messages.
- `MessagesChart` — a grouped bar chart (inbound vs. outbound, last 14 days), built as the first real chart in the app. Loaded the **dataviz skill** before writing it and followed its procedure: swapped the shadcn scaffold's placeholder `--chart-1`..`--chart-5` (previously plain grayscale, no hue at all) for the skill's validated categorical palette, ran `validate_palette.js` for both light and dark against the actual series pair before using it (all checks passed — CVD ΔE 24.7/26.8, well clear of the ≥8 floor), then followed the mark specs: bars capped at 24px with a 4px rounded data-end, a 2px gap between the two bars in a group, hairline gridlines, a legend (required for 2+ series), and a per-day hover/focus tooltip. No charting library added — plain HTML/CSS bars, since two fixed series over 14 points didn't justify the dependency.
- A **table view toggle** on the chart — the skill's required accessible fallback, so every value stays reachable without hovering.
- "Top agents by messages sent" table, ranking org members by their outbound message count.
- New `reports` translation namespace.

**Verified against the live database and a live dev server**

- Seeded 2 conversations (1 open, 1 closed) and 20 messages backdated across 5 days (mixing inbound/outbound, with `sent_by` set to both the owner and agent test accounts) directly via the service role, then compared the live page against hand-computed ground-truth counts queried straight from the database — all four stat tiles, the 14-day chart's bucketing (including the empty-day zeros), the table-view numbers, and the top-agents ranking matched exactly, not just "looked plausible."
- Confirmed interaction: hovering a bar shows the correct tooltip (right date, right counts, right color key); the table-view toggle renders all 14 days.
- Checked at desktop, mobile, and dark mode — the dark-stepped palette read correctly against the dark surface in a real screenshot, not just the validator's math.
- `next build`, `tsc --noEmit`, `eslint` all clean.
- All seeded test data removed afterward (conversations, messages, the fake LINE channel); confirmed `conversations`/`messages`/`audit_log` all back to empty and the three documented test accounts unchanged.

**Open items / not built yet**

- All aggregation happens by fetching rows and reducing in JS server-side (fine at current/test data volumes) rather than a dedicated SQL aggregation — would need a proper view/RPC if message volume grows large enough for this to matter.
- No date-range filter yet (fixed at "last 14 days"); no per-channel or per-conversation-status breakdown.
- Broadcast — the other remaining big item from this round, not started.
- Everything else carried over from Steps 6–9.

---

## 2026-09-22 (continued) — Phase 1, Step 11: Broadcast

Last of the four items originally offered (Audit Log / Settings / Reports / Broadcast — all four now done). Lives at `/app/broadcast`, nav item already existed from the Step 1 scaffold.

**Key design decision**

Broadcast uses LINE's actual **Broadcast API** (`/v2/bot/message/broadcast`), not our own recipient list built from `conversations`. LINE itself fans the message out to every follower of the channel, including people who've added the OA but never messaged in — which is what "broadcast" means in this product's context, and avoids ever needing to manage a mailing-list-style recipient table ourselves.

**What was built**

- One new migration, applied and verified live: `20260922040000_broadcasts.sql` — `broadcasts` table (RLS: any org member can view; no insert policy — writes only go through `record_broadcast()`, following `record_outbound_message`'s established pattern of recording only *after* the LINE API call has already been attempted, so history reflects what actually happened, success or failure, never what the UI merely tried).
- `broadcastMessage()` added to `src/lib/line/send-message.ts` alongside the existing `replyMessage`/`pushMessage` — same shape, no `to` field.
- `/app/broadcast`: a channel picker (only shown if the org has a connected LINE channel; otherwise an empty state links to `/admin/line-channels`) + message composer with a confirm dialog (irreversible, sends to everyone — same destructive-action pattern as disconnect/remove elsewhere in the app) + a send history table (time, channel, message, sender, status badge, with the error message available via a title tooltip on a failed row).

**Verified against the live database and a live dev server**

- Migration applied via SQL Editor, no errors.
- Script-level: `record_broadcast` succeeds for both `sent` and `failed` statuses and stores the error message correctly; an org member can read their organization's history; an anonymous session sees zero rows; a **direct insert into `broadcasts` bypassing `record_broadcast` is correctly rejected by RLS** (no insert policy exists on purpose); `record_broadcast` rejects an unknown `line_channel_id`.
- Full real UI flow: selected a seeded test channel from the dropdown, composed a message, confirmed the send dialog, submitted. Since the test channel's LINE credentials are fake, the actual push to LINE's API correctly failed — the composer showed the expected error, and (this is the point of the test) **the attempt was still recorded in history with `status = failed` and the real error message**, exactly per the design above. Reloaded the page and confirmed the history table shows the right message content, channel name, sender, and a "failed" badge. Checked at desktop, mobile, and dark mode. Zero unexpected console/page errors.
- What's still not verified: an actual successful broadcast reaching real LINE followers — needs a real connected LINE Official Account, same caveat as every other outbound LINE feature in this project (Inbox replies, images).
- `next build`, `tsc --noEmit`, `eslint` all clean. All test data (fake channel, broadcast rows) cleaned up afterward; confirmed `broadcasts`/`conversations` empty again and the three documented test accounts unchanged.

**Open items / not built yet**

- Text messages only — no image/rich-content broadcasts (matches the same text+image-first decision made for Inbox, but broadcast images weren't built this round).
- No scheduling (send now only) and no audience segmentation (LINE's Broadcast API itself doesn't support either — would need Multicast + our own recipient list to add this later, a bigger design change).
- Real end-to-end delivery verification, still blocked on a real LINE Official Account.
- This closes out the four items offered after Step 7 (Audit Log, Settings, Reports, Broadcast). Remaining bigger open items: message types beyond text/image in Inbox, invite-by-email, the Reset Password email template (user's own manual step), `database.types.ts` regeneration, and Rich Menu builder (the one User App feature from CLAUDE.md's original list not yet started).

---

## 2026-09-22 (continued) — Phase 1, Step 12: Rich Menu builder

Last of CLAUDE.md's originally-listed User App features (Inbox, Reports, Broadcast, Rich Menu — all four now built). Scope confirmed via AskUserQuestion first: grid-template layouts only (no freeform drag-and-drop canvas), background image uploaded by the user (not generated in-app). Lives at `/app/rich-menu`, nav item already existed from the Step 1 scaffold.

**What was built**

- Two migrations, both applied and verified live (the second one a live-discovered fix, see below):
  - `20260922050000_rich_menus.sql` — `rich_menus` table (RLS: members select; writes only through `record_rich_menu()` / `set_default_rich_menu()` / `delete_rich_menu_record()`, same "record what actually happened after calling LINE" pattern as `broadcasts`/`record_outbound_message`); a private `rich-menu-images` Storage bucket.
  - `20260922051000_fix_rich_menu_image_delete_policy.sql` — see bug below.
- `src/lib/line/rich-menu-layouts.ts` — the five layout templates (1x1, 2x1, 3x1, 2x2, 3x2), each a pure function from layout name to pixel bounds on a fixed 2500x1686 canvas (LINE's full-height rich menu size). Deliberately **not stored** in the database — computed identically on both the composer (for the visual grid preview) and the server action (for the actual LINE API payload), so there's one source of truth instead of two that could drift apart.
- `src/lib/line/rich-menu.ts` — `createRichMenu`, `uploadRichMenuImage`, `setDefaultRichMenuOnLine`, `deleteRichMenuOnLine` (LINE's Rich Menu API).
- `/app/rich-menu`: a composer (channel picker, layout picker with a live visual grid preview, image upload with **client-side pixel-dimension validation** against LINE's exact required size, then one label + action-type (message/URI) + action-value field per area) and a list of existing rich menus (image preview via a signed Storage URL, a "set as default" button, a delete button, a failed-creation badge with the error available on hover).
- Creation is a three-step server action or nothing: create on LINE → upload the image to LINE → record the result. If the image upload fails after the rich menu was already created on LINE, the action **deletes it from LINE again** before recording `status = failed`, rather than leaving an orphaned empty rich menu registered there.

**Two real bugs found live, not by inspection — both fixed**

1. **Deleting a rich menu didn't actually remove its image from Storage.** `deleteRichMenuAction` calls `.remove()` on the `rich-menu-images` bucket after deleting the DB row, but the original migration only granted `SELECT` and `INSERT` policies — no `DELETE`. The call returned **no error** (RLS-filtered deletes affect zero rows silently, the same way an RLS-filtered `UPDATE` does — Storage's API doesn't treat "removed 0 of 1 requested objects" as a failure), so this was only caught by explicitly re-listing the bucket after a delete and finding the object still there, not by checking the action's return value. Fixed with `20260922051000` (a `DELETE` policy, same `is_org_member`-on-path-prefix pattern as the existing ones). Re-verified afterward: deleted a seeded rich menu through the real UI and confirmed via direct DB/Storage queries that **both** the row and the image were actually gone.
2. (Caught before shipping, not live) A raw `switch` statement in `computeAreaBounds` was missing a closing brace before its `default` case — a straightforward syntax error, caught immediately by `tsc`.

**Verified against the live database and a live dev server**

- Both migrations applied via SQL Editor, no errors.
- Script-level (14 checks): `record_rich_menu` succeeds for both `published` and `failed` status, storing `line_rich_menu_id = null` correctly on failure; the `areas` jsonb round-trips exactly; `set_default_rich_menu` correctly unsets every other rich menu on the same channel when a new one is marked default (confirmed with three menus, not just two, so "unset all others" was actually exercised); org members can select, anonymous sessions see zero rows, and a **direct insert bypassing `record_rich_menu` is rejected by RLS**; `delete_rich_menu_record` actually removes the row; Storage — upload/download work for an org member, anonymous sessions can't list the bucket.
- Full real UI flow: selected a seeded channel, picked the 3x1 layout and confirmed exactly 3 area fields rendered (proving the picker actually drives area count, not just a static default); uploading a wrong-dimension image (an 800x600 real PNG, generated on the fly since no image-editing tool was available) showed the expected dimension error; uploading a correctly-sized 2500x1686 PNG showed a preview; filled in all 3 areas and submitted — since the test channel's LINE credentials are fake, LINE's real `createRichMenu` call correctly failed, and (matching the design) the attempt was still recorded with `status = failed`, visible in the list with the right name and a "creation failed" badge; deleted it through the real UI and confirmed (after the policy fix) both the row and the image were gone. Checked at desktop, mobile, and dark mode.
- What's still not verified: an actual rich menu appearing on a real LINE user's device — needs a real connected LINE Official Account, same caveat as every other outbound LINE feature in this project.
- `next build`, `tsc --noEmit`, `eslint` all clean. All test data (fake channels, rich menu rows, uploaded images) cleaned up afterward; confirmed `rich_menus`/`broadcasts`/`conversations` all empty and the three documented test accounts unchanged.

**Open items / not built yet (at the time this step shipped)**

- No freeform drag-and-drop layout (explicitly out of scope for this round, per the confirmed decision) — **added the same day, see the follow-up entry below.**
- No "compact" 843px-height image size — every template uses the full 1686px height.
- No image cropping/resizing in-app; the user's uploaded file must already be exactly the right pixel dimensions.
- This closes out CLAUDE.md's originally-listed User App feature set (Inbox, Reports, Broadcast, Rich Menu). Remaining open items across the whole project: message types beyond text/image in Inbox, invite-by-email, the Reset Password email template (user's own manual step), `database.types.ts` regeneration, and real end-to-end LINE OA verification for every outbound feature (Inbox replies/images, Broadcast, Rich Menu) once a real LINE Official Account exists.

---

## 2026-09-22 (continued) — Phase 1, Step 13: Rich Menu — custom drag-and-drop layout, menu-switch action, and a popup layout picker

User asked for three things right after Step 12 shipped, mid-review of the finished feature: (1) a genuinely custom area layout — not just the five grid templates — with drag/resize on a real preview; (2) a button action that switches the user to a *different* rich menu (LINE's own "tabs" mechanism); (3) turn the always-expanded layout grid into a popup, and make the live preview look like an actual phone/chat mockup rather than an abstract grid. Not scoped via AskUserQuestion first — the request was specific and decisive ("อยากให้เพิ่ม feature นี้ไปเลย" / "want you to add this feature, go ahead"), so treated as direction to execute rather than another round of scope-narrowing.

**What was built**

- Two more migrations, both applied and verified live:
  - `20260922060000_rich_menu_custom_layout_enum.sql` — adds the `'custom'` value to `rich_menu_layout`. Kept as its own migration on purpose: Postgres won't let a newly added enum value be referenced by a statement in the same transaction that added it.
  - `20260922060100_rich_menu_switch_action.sql` — adds `rich_menus.line_rich_menu_alias_id`; replaces `record_rich_menu()`'s signature to accept an explicit `p_id` (so the caller can create the LINE-side alias — which needs *something* stable to reference — before the row itself exists) and `p_line_rich_menu_alias_id`.
- **Custom layout**: `rich-menu-layouts.ts` reworked so every area (template or custom) is expressed the same way — bounds as 0-100 percentages, resolution-independent — via `computeTemplateAreaBoundsPercent()` for templates and free-form user input for custom. Percent bounds are only converted to real 2500x1686 pixels at the very last step, server-side (`percentToPixelBounds()`, clamped so drag/resize rounding error can never push an area outside the canvas, which LINE rejects).
- **`RichMenuPhonePreview`** (new component) — a phone-shaped mockup with a fake chat area above the rich menu image, satisfying the "real mockup" request directly. In custom mode it **doubles as the area editor itself** rather than a separate non-visual form next to a separate static preview: drag empty canvas to draw a new area, drag a body to move it, drag the corner handle to resize, tap × to delete. Pointer events (not mouse events) so it works on touch too. In template mode the same component renders read-only, so what you see is what the *template* modes also actually look like — not just the custom one.
- **`richmenuswitch` action type** — LINE's Rich Menu Alias mechanism (https://developers.line.biz/en/reference/messaging-api/#rich-menu-alias). Every successfully published rich menu now gets an alias created right after its image upload (alias id = the row's own uuid, generated client-side in the server action *before* the row exists, exactly why `record_rich_menu` needed `p_id`). An area's "switch to another menu" target is chosen from a dropdown of that channel's other already-published menus (passed down per-channel from the page); the server action re-validates at submit time that the target is still published and on the *same* channel before resolving it to an alias id.
- **`LayoutPickerDialog`** — the five templates + "custom" moved into a popup (shadcn `Dialog`, newly added to the project) instead of an always-expanded 6-option grid, addressing the "save vertical space" request directly. The trigger shows a small live thumbnail of the current selection.
- Full 3-step-or-nothing rollback on create, extended: create on LINE → upload image → **create the alias** — if the alias step fails after the menu was already created and imaged on LINE, the menu is deleted from LINE again before recording `status = failed`, so a failure never leaves a half-registered menu with no way to reference it.
- `deleteRichMenuAction` now also deletes the LINE-side alias (best-effort) before deleting the rich menu itself.

**Verified against the live database and a live dev server**

- Both migrations applied via SQL Editor; confirmed applied by calling `record_rich_menu` with the new signature and `p_layout: 'custom'` and getting a business-logic error ("LINE channel not found") rather than a schema/signature error.
- Script-level: `record_rich_menu` accepts an explicit `p_id` and custom percent bounds, storing `line_rich_menu_alias_id` correctly (the `areas` jsonb "round-trip" check initially reported a mismatch — turned out to be Postgres jsonb reordering object keys, not a data problem; verified the actual values field-by-field and they matched exactly); a `richmenuswitch` area referencing another menu round-trips its target id correctly.
- Full real UI flow, driven with real pointer-drag gestures (not just filled form fields): opened the layout popup, confirmed it's a real dialog that closes on selection; uploaded a valid 2500x1686 image; **drew two areas by dragging on the live phone preview** and confirmed each drag produced exactly one new area field; set the second area's action to "switch to another menu" and confirmed the target dropdown correctly listed a pre-seeded published menu on the same channel; submitted. Since the test channel's LINE credentials are fake, the real `createRichMenu` call correctly failed with LINE's actual auth-error response — and **the resulting database row was inspected directly**, confirming: `layout = 'custom'`, both areas' bounds matched the actual dragged rectangles (e.g. ~10-50%/~10-50% and ~55-90%/~10-90%, matching the drag coordinates used), the second area's `action_value` was correctly resolved to the target menu's real row id, and `status = 'failed'` with LINE's real error message — proving the entire pipeline (drag → percent bounds → server resolution → real LINE API call → correct failure recording) end to end, not just that individual pieces work in isolation.
- Two dead-end test-script selector bugs along the way (picking the wrong `<select>` by index, and matching the wrong `aspect-[2500/1686]` element when more than one was on the page) were found to be exactly that — test-script mistakes, confirmed by checking the underlying DOM/DB state directly — not product bugs. Added a `data-testid="rich-menu-canvas"` to the preview's interactive surface to make it reliably selectable, which is a reasonable thing to leave in the codebase.
- Checked at desktop, mobile (the preview reflows below the form, as expected in a single-column layout), and confirmed no unexpected console/page errors.
- `next build`, `tsc --noEmit`, `eslint` all clean. All test data (fake channels, rich menu rows, uploaded images) cleaned up afterward; confirmed empty tables and unchanged test accounts.

**Open items / not built yet**

- No area-count limit warning in the UI before hitting LINE's hard cap of 20 (silently stops accepting new drawn areas past 20).
- No handling for deleting a rich menu that other menus still reference via `richmenuswitch` — those areas would point at a dead alias. Acceptable edge case for now; would need either a reference check before delete or a "this menu is used as a switch target by N others" warning.
- Everything else carried over from Step 12.

---

## 2026-09-22 (continued) — Bug fix: sidebar/bottom-nav active state didn't match nested routes

User-reported: "sidebar active menu ไม่ตามกับ url path" (the sidebar's active item doesn't track the current URL). Both `SidebarNav` and `BottomNav` computed `active` with an exact match (`pathname === item.href`), so any nested route — the only one that exists today is `/app/inbox/[conversationId]`, the Inbox thread view — left every nav item unhighlighted while viewing it, since `/app/inbox/<uuid>` never equals `/app/inbox`.

**Fix**: `active = pathname === item.href || pathname.startsWith(\`${item.href}/\`)` in both components. Checked that no current nav href is a prefix of another (e.g. `/admin/line-channels` isn't a prefix of any other admin route), so a plain prefix match is safe without needing a more careful segment-boundary check.

**Verified live**: seeded a real conversation via the webhook, logged in, confirmed Inbox was active on both the list page and the nested thread page (previously only the former), confirmed a different nav item (Reports) correctly stayed inactive on the thread page, and confirmed the same fix holds on the mobile bottom nav. `next build`/`tsc`/`eslint` clean. Test data cleaned up afterward.

---

## 2026-09-22 (continued) — Verification: Inbox image messages (inbound + outbound)

Picked via AskUserQuestion from the remaining open items. Turned out to be mostly a **verification gap, not a missing-feature gap** — both the webhook's image-download branch (Step 7) and `MessageThread`'s `<img>` rendering already existed in code, but had never actually been exercised end-to-end; Step 7's own testing only ever sent `type: "text"` events through the webhook.

**What was actually tested** (since the one genuinely untestable piece — the webhook's live fetch from LINE's `api-data.line.me` with a real message id — still needs a real connected LINE Official Account, same as ever):

- Simulated a successful inbound image exactly the way the webhook's own code does it *after* a real LINE download would succeed: uploaded real image bytes to the `line-media` bucket at the same `{organization_id}/{conversation_id}/{line_message_id}.png` path convention the webhook uses, then called `insert_inbound_message` directly — exercising every step downstream of the one call that can't be faked.
- In a real browser: the image rendered as an actual `<img>` in the thread; its `src` was a genuine `line-media` signed URL; fetching that URL returned `200` with an `image/*` content-type (not a broken/expired link); the browser actually decoded it (`naturalWidth > 0`, not a broken-image icon).
- Outbound: uploaded a real image through the actual `ReplyComposer` UI (file picker → real browser upload to `line-media`, covered by its own RLS insert policy) and confirmed it reached the point of calling LINE's push API, failing there with the expected error (fake channel credentials) — the same "mechanics proven, real delivery blocked" pattern as every other outbound LINE feature in this project.
- Zero console/page errors throughout. Test data (fake channel, conversation, uploaded image) cleaned up afterward.

**Open items / not built yet**

- The one piece that remains genuinely unverified across the whole project: an actual image arriving from a real LINE user's device through a real, connected LINE Official Account. Nothing further can close this gap without one existing.
- Message types beyond text/image (video, audio, file, sticker, location) — still not built, unchanged from Step 7.

---

## 2026-09-22 (continued) — Phase 1, Step 14: Invite-by-email for people without an existing account

Explicitly scoped out of Step 6 ("Full invite-by-email flow... explicitly out of scope for this step"), picked back up via AskUserQuestion.

**Design decision**: used Supabase's own `admin.inviteUserByEmail()` rather than building a bespoke `organization_invites` table + token system. It already does what's needed — creates an unconfirmed auth user and sends an email whose accept link runs through `verifyOtp()`, the exact same mechanism `/auth/confirm` (built in Step 5 for password reset) already handles for any `EmailOtpType`, `'invite'` included. The one gap it doesn't cover — *which organization, what role* — is carried through as `user_metadata` (`invited_org_id`, `invited_role`) set when the invite is sent, and `handle_new_user()` (already running for every new auth user to create their profile row) now also completes the `organization_members` insert if that metadata is present, wrapped in its own exception handler so a malformed/stale invite never blocks account creation itself.

**What was built**

- One migration, applied and verified live: `20260922070000_invite_by_email.sql` — extends `handle_new_user()` only; no new tables.
- `addMember` (in `admin/users/actions.ts`) now branches on whether `get_user_id_by_email` found an existing account: found → the existing Step 6 behavior (insert directly); not found → calls `inviteUserByEmail` with the org/role metadata and a `redirectTo` pointing at `/reset-password` (reusing that page as-is for "set your initial password," not just "reset" one — same form, same action, no new page needed). Logs a new `member.invited` audit action either way.
- `AddMemberSheet` updated: the old "no account found" error message is gone (that's no longer an error case); a new `inviteSent` success message explains what happens next, and — unlike the existing-member path — the sheet deliberately does **not** auto-close on invite, since there's no new table row to serve as confirmation the way there is for an existing member.
- `getSiteOrigin()` (previously local to the auth actions file) exported and reused here, rather than duplicated.

**A real, disclosed behavioral quirk found live (not a bug, but worth knowing)**: `handle_new_user()` fires on `auth.users` row *creation*, which happens at invite-*send* time — so an invited person becomes a real `organization_members` row (visible in the `/admin/users` list, counted everywhere) immediately, before they've clicked anything or set a password. They still can't log in until they do (no password set, email unconfirmed), so this isn't a security gap, but the admin UI currently shows no "pending" distinction — an invited-but-not-yet-accepted row looks identical to an active member. Documented here rather than fixed, since adding that distinction would mean either a real invites table (the exact thing this design avoided) or an extra `auth.users.confirmed_at` lookup per row.

**Verified against the live database and a live dev server**

- Migration applied via SQL Editor, no errors.
- Discovered along the way: this project's Supabase instance (default built-in email provider, no custom SMTP configured) can't actually send `inviteUserByEmail` to arbitrary test addresses — it fails immediately, either with a misleading "Email address is invalid" or "email rate limit exceeded," regardless of the address's validity. This is an infrastructure/quota limitation of the *default* email sender, not a bug in this feature — confirmed by using `admin.generateLink({ type: 'invite' })` instead (which creates the exact same user + metadata without actually attempting to send anything) and getting a clean success every time.
- Using `generateLink`, ran the **entire accept flow for real**: generated an invite for a brand-new email with org+role metadata → confirmed the `organization_members` row already existed immediately (the quirk above) → visited the real `/auth/confirm?...&type=invite` link → landed on `/reset-password` (not an error) → set a password → redirected into `/th/app`, **not** bounced to onboarding (proving membership was actually recognized, not just present in the table) → signed out → signed back in with the newly-set password and reached `/app` again. Every step exercised for real, not mocked.
- Confirmed a malformed `invited_org_id` (a nonexistent uuid) in the metadata does **not** block user creation — the trigger's exception handler holds.
- Full real UI flow: opened `AddMemberSheet`, entered a genuinely new email, submitted — hit the same real-send limitation described above (`email rate limit exceeded`, shown as-is, not translated — a rough edge, but the form stayed usable and didn't crash). Since the underlying mechanics were already proven correct via `generateLink`, this confirms the send-triggering code path is reached correctly by real UI interaction; the infrastructure limitation is the only thing standing between this and a real email landing in an inbox.
- `next build`, `tsc --noEmit`, `eslint` all clean. All test users deleted afterward (deleting the `auth.users` row correctly cascade-removes the `organization_members` row too — confirmed directly, not assumed); confirmed the three documented test accounts are the only members left and `audit_log` is empty again.

**Open items / not built yet**

- No "pending invite" indicator in the admin UI (see the quirk above).
- No way to resend or revoke an invite from the UI (would need to look the user up and call `inviteUserByEmail` again, or `admin.deleteUser`, neither wired up yet).
- Real email delivery is blocked on configuring custom SMTP for this Supabase project — same category of external dependency as the still-pending Reset Password email template edit from Step 5, not something fixable from application code.
- Remaining open items across the whole project: message types beyond text/image, Roles/Billing/Settings admin pages (nav items exist, no pages behind them), `database.types.ts` regeneration, and real end-to-end LINE OA verification.

---

## 2026-09-22 (continued) — Phase 1, Step 15: Inbox message types — sticker and file

Picked via AskUserQuestion over the remaining Roles/Billing/Settings placeholder pages, as the more substantial piece. Extends Inbox beyond text/image (video, audio, and location remain out of scope, unchanged).

**What was built**

- Two migrations, applied and verified live: `20260922080000_inbox_more_message_types_enum.sql` (adds `'sticker'`/`'file'` to `message_type`, its own migration for the usual enum-in-same-transaction reason) and `20260922080100_inbox_more_message_types.sql` (updates the `messages_content_or_media` check constraint to cover both new types).
- **Sticker**: no bytes to fetch at all — LINE serves stickers from a public, predictable CDN URL built from `packageId`/`stickerId`. `content` stores those two ids as JSON; the UI builds the CDN URL directly (`https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker.png`), `media_path` stays null (same shape as text).
- **File**: same download-then-store shape as image (LINE's Content API serves file bytes the identical way), but `content` holds the original filename so the UI shows something better than a bare link; the file's own extension (from `fileName`) is used for the stored path rather than guessing from `Content-Type`.
- Webhook route restructured around an `isInboundMessageType()` type guard covering all four types now, instead of a two-way `!== "text" && !== "image"` check.
- `MessageThread` renders each type distinctly: image (existing), sticker (an `<img>` pointed at LINE's CDN), file (an icon + filename + download link, opens in a new tab), text (existing, unchanged). The inbox list's message preview and signed-URL resolution (any message with a non-null `media_path`, not just images) were both generalized the same way.

**Verified against the live database and a live dev server**

- Both migrations applied via SQL Editor, no errors.
- **Sticker was tested fully for real, through the actual webhook** — unlike every other inbound-media feature in this project, a sticker event needs no call to LINE's Content API, so a fake channel token is no obstacle at all. Sent a real signed webhook request with LINE's own well-known "Brown celebrating" sticker (`packageId=11537`, `stickerId=52002734`); confirmed the conversation and message row were created correctly, `content` held the right JSON, `media_path` was null, and a retried delivery didn't duplicate. In the browser: the sticker rendered as a real `<img>`, its CDN URL returned a genuine `200 image/png`, and the browser actually decoded it (not a broken-image icon) — visible in the screenshot as the actual LINE sticker artwork, not a placeholder.
- **File**: confirmed the webhook fails *gracefully* when the real LINE download can't succeed (fake token) — the conversation still gets created, no partial/corrupt message row is left behind, same pattern as image. Then, same technique used for images in Step 7's follow-up: uploaded real bytes to `line-media` and called `insert_inbound_message` directly to exercise everything downstream of the one call that can't be faked. In the browser: rendered as a filename + icon + working download link; fetching that signed URL returned the actual uploaded bytes (`200`, correct content-type).
- List page preview text confirmed showing "ไฟล์แนบ" for the file message.
- Zero console/page errors. `next build`, `tsc --noEmit`, `eslint` all clean. All test data (fake channel, conversation, messages, uploaded file) cleaned up afterward; confirmed empty tables and unchanged test accounts.

**Open items / not built yet**

- Video, audio, and location messages remain silently skipped (never in scope for this round).
- No way to *send* a sticker or file as an outbound reply — this round was inbound rendering only; `ReplyComposer` still only supports text and image.
- Remaining open items across the whole project unchanged: Roles/Billing/Settings admin pages, `database.types.ts` regeneration, real end-to-end LINE OA verification (now including stickers/files specifically, though the sticker rendering path needed no faking at all and is about as proven as it can be without a real account).

---

## 2026-09-22 (continued) — Phase 1, Step 16: Webhook URL display, Roles reference page, Billing placeholder

Closes out the remaining nav items from the Step 1 scaffold that had no page behind them yet. "ตั้งค่าระบบ" (Settings) explicitly deferred per the user — genuinely unclear what it should contain beyond what Organization Settings (Step 9) already covers, and nothing else in the product currently needs it (no notification system exists to configure).

**A real, concrete gap found along the way, not asked for**: nowhere in the app did a user ever see the actual webhook URL (`/api/line/webhook`) they need to paste into the LINE Developers Console when connecting a real channel — every LINE integration built so far (Step 4 onward) assumed the user already knew it. Added a `WebhookUrlCard` to `/admin/line-channels`, computed from the real request origin (extracted the existing `getSiteOrigin()` helper — previously private to the `(auth)` actions file — into a shared `src/lib/get-site-origin.ts`, since it's now needed from both a Server Component and multiple Server Actions), with a working copy-to-clipboard button.

**What was built**

- `/admin/roles` — a static reference table (owner/agent/analyst × 5 capabilities). Deliberately **honest about current reality** rather than aspirational: Agent and Analyst have identical enforced permissions everywhere in this codebase (Inbox reply, Broadcast send, Rich Menu create have never been role-gated beyond org membership — a deliberate consistency choice made back in the Inbox step), so the page says so directly ("Agent and Analyst currently have identical permissions... a read-only distinction for Analyst isn't implemented yet") instead of implying a distinction that isn't actually enforced.
- `/admin/billing` — an explicit placeholder (current plan shown as "Free", a "not available yet" state) rather than fabricated plan/pricing data. No payment provider is wired up; this is just the empty shell where that will live.
- `WebhookUrlCard` + `getSiteOrigin()` extraction, as above.

**Verified against the live database and a live dev server**

- No migration needed — none of this touches the database.
- Webhook URL card: confirmed it renders a real, correctly-formed URL (not a placeholder string) and that the copy button actually writes it to the clipboard (read back via `navigator.clipboard.readText()` in the browser, not just "no error thrown").
- Roles and Billing pages load correctly; confirmed a non-owner (agent) is bounced away from both by the existing owner-only admin layout guard, same as every other admin route.
- Checked at desktop, dark mode, and mobile.
- `next build`, `tsc --noEmit`, `eslint` all clean.

**Open items / not built yet**

- "ตั้งค่าระบบ" (Settings) nav item still has no page — explicitly deferred, not scoped.
- Roles page is read-only reference content; there's no way to define *custom* roles or change what a role can do (would be a much bigger feature).
- Everything else carried over: Inbox message types beyond sticker/file, outbound sticker/file replies, `database.types.ts` regeneration, real end-to-end LINE OA verification.

---

## 2026-09-22 (continued) — Phase 1, Step 17: Outbound file replies in Inbox

**A platform limitation caught before writing any code, not after**: LINE's Messaging API has no message object type for a bot to send a file attachment back to a user — the full set of outbound message types is text, sticker, image, video, audio, location, imagemap, template, and flex. A bot can *receive* a file (built in Step 15) but can never push one the way it can push an image. Flagged this to the user before building anything; agreed approach: send it as an ordinary text message containing the filename and a download link, not a native attachment.

**What was built**

- No migration — reuses the `'file'` message type and `messages` schema from Step 15 exactly as-is (that step already anticipated outbound use by keeping the check constraint direction-agnostic).
- `sendFileReply(conversationId, mediaPath, fileName)` in `inbox/actions.ts` — generates a **7-day** signed Storage URL (not the 1-hour one `sendImageReply` uses): the image URL only needs to survive one immediate fetch by LINE's own server, but a file link is something the customer might actually click days later, so it needs to stay valid that long. Pushes a text message (`📎 {fileName}\n{url}`), and only calls `record_outbound_message` (with `p_type: "file"`) *after* that push succeeds — same "never record what didn't actually happen" rule as every other outbound path in this project.
- `ReplyComposer` gained a second attach button (paperclip icon) alongside the existing image one, with its own upload handler and a separate "uploading file..." status state.

**Verified against the live database and a live dev server**

- Script-level: `record_outbound_message` accepts `p_type: 'file'` with content+media_path; a real 7-day signed URL was generated for an uploaded object and actually served it (`200`) when fetched.
- Full real UI flow: seeded a conversation via the real webhook, opened the thread, confirmed the new attach-file button is present, selected a real local file through the actual file picker. The upload to Storage succeeded (client-side, independent of LINE); the subsequent push to LINE's API correctly failed (fake channel credentials, same as every other outbound test in this project) and showed the expected error. **Confirmed directly in the database afterward that this left zero outbound message rows** — proving the "record only after a successful push" rule held for this new path too, not just assumed from reading the code. Leftover uploaded (but never-sent) Storage object cleaned up along with everything else.
- Zero console/page errors. `next build`, `tsc --noEmit`, `eslint` clean. Test data cleaned up; confirmed test accounts unchanged.

**Open items / not built yet**

- Outbound stickers still not supported (would need a sticker picker UI backed by a known valid packageId/stickerId list — LINE doesn't let a bot send arbitrary sticker IDs, only ones from packages available to that channel). — **added the same day, see the follow-up entry below.**
- The file's signed link expires after 7 days; there's no mechanism to regenerate/re-share an expired one from the UI.
- Remaining open items across the whole project unchanged: "ตั้งค่าระบบ" page, `database.types.ts` regeneration, real end-to-end LINE OA verification.

---

## 2026-09-22 (continued) — Phase 1, Step 18: Outbound sticker replies in Inbox

Last well-scoped, unblocked increment before everything remaining is either explicitly deferred (Settings page) or genuinely blocked (`database.types.ts` regen needs a workflow change the user hasn't opted into; real LINE OA verification needs an account that doesn't exist yet).

**What was built**

- No migration — reuses the `'sticker'` type and jsonb `content` shape (`{packageId, stickerId}`) from Step 15's *inbound* sticker rendering, now used for outbound too.
- `src/lib/line/sample-stickers.ts` — a small curated set of known-good sticker ids. LINE has no API to ask "what stickers can this channel send" — a bot can only push a sticker id that actually exists in a package available to it, so this uses LINE's own documented example package (`11537`, the "Brown & Cony" set from LINE's Messaging API reference docs) rather than guessing at arbitrary ids.
- `sendStickerReply(conversationId, packageId, stickerId)` — pushes `{ type: "sticker", packageId, stickerId }`, then records it with `record_outbound_message` (`p_type: "sticker"`) only after the push succeeds, same rule as every other outbound path.
- `StickerPickerDialog` — a small popup (reusing the `Dialog` component from Step 13) showing the curated stickers as thumbnails; picking one sends immediately and closes the dialog. Added to `ReplyComposer` as a third button alongside image/file.

**A real bug caught live, then correctly ruled out as a false alarm — worth recording the process, not just the conclusion**: the first screenshot of the picker showed only 2 of 8 stickers rendering, the rest blank white boxes. Before treating that as "half the curated list is broken," checked the actual CDN responses directly (`curl` — every id returned `200`, real `image/png`, real byte counts in the 5.6–11KB range, not empty). Downloaded two of the "blank" ones and opened them directly — both were genuine, correctly-drawn stickers (a heart-eyed Sally chick, among others), not corrupt or placeholder images. Re-ran the browser check waiting for every `<img>` to actually finish decoding (`naturalWidth > 0`) instead of a fixed timeout, and all 8 rendered correctly. Root cause: the first screenshot was taken before several of the images had finished loading over the network — a timing artifact in the test script itself, not a bug in the sticker data or the component. Recorded here because the *wrong* conclusion ("the curated list is half-broken, cut it down to 2") was genuinely one keystroke away, and the fix would have been to delete working data based on a flawed test.

**Verified against the live database and a live dev server**

- Script-level: `record_outbound_message` accepts `p_type: 'sticker'`.
- Full real UI flow: seeded a conversation via the real webhook, opened the sticker picker, confirmed it's a real dialog showing all 8 thumbnails, confirmed (after fixing the test's own timing bug, above) that every thumbnail is a genuinely distinct, correctly-rendering LINE sticker — not just that an `<img>` tag existed. Picked one; the dialog closed immediately. The push to LINE's API failed as expected (fake channel credentials, same pattern as every outbound feature in this project) and showed the right error. **Confirmed directly in the database that this left zero outbound message rows** — same "record only after a real success" guarantee verified for text/image/file in earlier steps, now covering sticker too.
- Zero console/page errors. `next build`, `tsc --noEmit`, `eslint` clean. Test data cleaned up; confirmed test accounts unchanged.

**Open items / not built yet**

- The curated sticker set is small (8) and fixed in code — no way for an org to add their own or browse a larger catalog; a real product would eventually want this backed by whatever sticker packages the channel actually has, which needs infrastructure this template doesn't have.
- Remaining open items across the whole project unchanged: "ตั้งค่าระบบ" page, `database.types.ts` regeneration, real end-to-end LINE OA verification.

---

## 2026-09-22 (continued) — Phase 1, Step 19: Broadcast — images, scheduled send, audience segmentation

User asked to build Broadcast out "แบบเต็มระบบ" (the full system) after being offered a choice between three individual pieces (images / scheduling / segmentation) — took that as direction to build all three together rather than re-narrowing further, given how specific and decisive the request was.

**What was built**

- Two migrations, applied and verified live:
  - `20260922090000_broadcast_status_enum.sql` — adds `'scheduled'`/`'sending'` to `broadcast_status`, its own migration for the usual enum-in-same-transaction reason.
  - `20260922090100_broadcast_full_system.sql` — new `broadcast_audience` enum (`'all'` | `'conversations'`); `scheduled_at`, `audience`, `image_media_path` columns; `content` relaxed to nullable with a check constraint requiring at least one of content/image; `record_broadcast()`'s signature extended; new `cancel_scheduled_broadcast()`.
- **Audience segmentation**: `'all'` keeps using LINE's Broadcast API (fans out to every follower, unchanged). New `'conversations'` option uses LINE's **Multicast API** instead, targeting the distinct `line_user_id`s already in that channel's own `conversations` table (people who've actually messaged in) — batched at 500 recipients per call, LINE's own multicast limit.
- **Scheduled send**: composer gained a "send later" toggle + datetime picker. A scheduled broadcast is recorded with `status = 'scheduled'` and nothing is sent to LINE at submit time. A new route, **`/api/broadcasts/process-due`**, does the actual sending — designed to be triggered by an external scheduler (this is a serverless Next.js app with no persistent worker, and the template doesn't assume a specific host, so this is deliberately generic rather than assuming Vercel Cron specifically). Protected by a `CRON_SECRET` bearer token (checked via `Authorization` header — matching Vercel Cron's own convention of auto-sending that header — with a `?secret=` query param fallback for other schedulers). Documented in `.env.local.example`; **the user still needs to configure an actual scheduler** to call this route periodically — nothing in the app triggers it on its own.
  - Race safety: the route claims each due broadcast (`status: 'scheduled' → 'sending'`, conditioned on still being `'scheduled'`) before processing it, so two overlapping invocations can't send the same broadcast twice.
  - Org members can cancel a still-`'scheduled'` broadcast from the history table; once claimed or resolved, cancellation is rejected.
- **Image broadcasts**: composer gained an optional image attach (mirroring Inbox's image reply — upload to `line-media`, resolved to a signed URL, sent as LINE's `image` message type), independent of the scheduling/audience choices. A broadcast can be text-only, image-only, or both (LINE allows multiple message objects per send).
- `src/lib/broadcast/send-broadcast.ts` — the actual delivery logic (`performBroadcastSend`, `buildBroadcastMessages`) factored out into its own module specifically so the "send now" server action and the cron-triggered route can't drift apart on what a stored broadcast actually sends; both call the exact same functions.
- History table extended with audience and scheduled-time columns, an image thumbnail, a `Cancel` button for scheduled rows, and four status states (scheduled/sending/sent/failed) instead of two.

**A real logic bug caught and fixed before it ever ran, not live**: the composer's success message picked "scheduled" vs. "sent now" text based on the `scheduleEnabled` toggle state — but that same submit handler resets the toggle back to `false` right before showing the message, so the message would have always claimed "sent now" even after a successful *schedule*. Caught by re-reading the state-reset order while writing the component, not by testing; fixed by capturing the outcome in its own `sentState` (`"immediate" | "scheduled" | null`) set once, before the toggle reset touches anything.

**Verified against the live database and a live dev server**

- Both migrations applied via SQL Editor, no errors.
- Script-level (12 checks): `record_broadcast` accepts the full new parameter set; an image-only broadcast (`content: null`) is accepted; a broadcast with **neither** content nor image is correctly rejected by the check constraint; a scheduled broadcast due in the past round-trips correctly.
- **The cron route was exercised for real, not simulated**: called `/api/broadcasts/process-due` with no secret (401), the wrong secret (401), then the correct one — which actually claimed the due broadcast, called the real `performBroadcastSend` → real LINE API (failed as expected, fake channel credentials, same as every other outbound test in this project), and recorded `status = 'failed'` with LINE's real error message. **Confirmed a second run of the same route does not reprocess the now-resolved broadcast** — the claim mechanism actually works, not just reads correctly. Separately confirmed `cancel_scheduled_broadcast` succeeds for a future-dated scheduled broadcast, actually removes the row, and is rejected once a broadcast has already resolved.
- Full real UI flow: switched audience to "conversations" and saw the multicast hint; attached a real image and saw the preview; enabled scheduling and picked a future time via the actual `datetime-local` picker; submitted and saw the scheduled-success message (not the wrong one — confirming the bug above stayed fixed); reloaded and confirmed the history table showed the scheduled time, correct audience label, and image thumbnail; cancelled it through the real Cancel button — the row disappeared from a fresh **direct database query** (one of the test script's own body-text assertions reported a false failure here from a revalidation-timing artifact, same category of test-script flakiness seen several times earlier this session; the database state was the source of truth and confirmed correct).
- Checked for console/page errors throughout — none. `next build`, `tsc --noEmit`, `eslint` all clean.
- All test data (fake channel, seeded conversations, broadcast rows) cleaned up afterward; confirmed empty tables and the three documented test accounts unchanged.

**Open items / not built yet**

- Nothing actually triggers `/api/broadcasts/process-due` yet — the user needs to set up an external scheduler (Vercel Cron Jobs or equivalent) pointed at it with `CRON_SECRET`, on whatever interval makes sense (e.g. every minute). Verified the route itself works correctly; the "something calls it on a schedule" half is infrastructure outside this app.
- No timezone picker for the schedule time — uses whatever timezone the browser's `datetime-local` input and `Date` parsing resolve to.
- Audience is a fixed choice between exactly two options (all vs. conversations) — no custom segments/tags, same limitation noted when segmentation was originally scoped out.
- Real end-to-end delivery (either audience, scheduled or immediate) still needs a real connected LINE Official Account to verify beyond "the mechanics are proven and LINE's own API rejects our fake credentials correctly."

---

## 2026-09-23 — Phase 1, Step 20: Broadcast composer redesign — templates, live preview, test-send, drafts; new Tags system

User asked for the Broadcast composer to look and work like the Rich Menu page: a template picker, a live preview, a way to send a test to one specific person, and full draft CRUD. Two points were ambiguous and confirmed via `AskUserQuestion` before building: (1) the "badge" shown on a contact's name — confirmed as a **new, org-configurable tag/category system**, not a reuse of existing data like conversation status; (2) who a test send can target — confirmed as **both** picking from a contact list **and** typing a raw UID manually, with the manual-UID path also resolving and showing that person's name/picture when it matches an existing conversation.

**What was built**

- Three migrations, applied via SQL Editor and verified live:
  - `20260923000000_broadcast_draft_status_enum.sql` — adds `'draft'` to `broadcast_status`, its own migration for the usual enum-in-same-transaction reason.
  - `20260923000100_tags.sql` — new `tags` (org-scoped, name + color) and `conversation_tags` (join) tables. No new PL/pgSQL functions needed — unlike `record_broadcast`/`assign_conversation`, nothing here has to reach across to a *different* row's `organization_id`, so plain RLS policies are enough. Permission split: defining/editing/deleting tags is **owner-only** (same tier as Roles/Billing/Settings); assigning an existing tag to a conversation is **any org member** (an operational action, same tier as replying or assigning a conversation).
  - `20260923000200_broadcast_templates.sql` — new `broadcast_template` enum (`'text' | 'image_text' | 'image_link'`); `template`, `link_url`, `link_label` columns on `broadcasts`; `record_broadcast()` re-signatured again; new `update_broadcast()` (updates a broadcast row in place — used both to re-save an edited draft and to send/schedule *from* a draft, so a sent draft doesn't leave an orphan row behind) and `delete_broadcast_draft()` (hard-deletes, only for `status = 'draft'`).
- **Templates**: "Text only" (unchanged), "Image + text" (unchanged, now named explicitly), and new **"Image + link button"** — LINE has no clickable/tappable plain image message, so this uses LINE's **Buttons Template** message (`type: "template"`, one `uri` action) instead. `buildBroadcastMessages()` in `send-broadcast.ts` branches on template to build the right LINE message shape; used identically by send-now, scheduled-send (the cron route), and test-send, so none of the three can drift apart on what a stored broadcast actually sends.
- **Live preview**: `BroadcastPreview` — a phone-shaped chat mockup (same visual idea as `RichMenuPhonePreview`), read-only, showing the composed message as it's being typed: a chat bubble for text/image+text, a card mockup (image + text + button) for image+link.
- **Template picker**: `TemplatePickerDialog`, directly modeled on `LayoutPickerDialog` — a popup grid rather than an always-expanded row, since it's a choice made once per broadcast.
- **Custom tags**: new Admin Panel page (`/admin/tags`, owner-only) to create/delete tags (name + one of 9 fixed swatch colors — deliberately not a free-form color picker, so every tag stays legible in both themes without per-tag contrast handling). `TagBadge` (a colored dot + name) is shared across three places: the Tags admin list, the Inbox thread header, and the Broadcast contact picker. `ConversationTags` in the Inbox thread header lets any member assign/unassign existing tags to the conversation they're looking at (a `DropdownMenu` of not-yet-assigned tags to add, an `×` on each assigned badge to remove).
- **Test send**: a section in the composer with two explicit modes — `ContactPickerDialog` (searchable list of the selected channel's conversation contacts, each row showing avatar, name, and its assigned tag badges — this is where the confirmed tag requirement actually surfaces) and a raw UID text input, which cross-checks what's typed against the same contact list and shows a resolved name/picture preview when it matches, without blocking sending to an unmatched UID (per the user's explicit "both, and preview if it resolves" answer). `sendTestBroadcast()` pushes via `pushMessage` to that one `line_user_id` — deliberately **not** recorded in broadcast history, since it's a throwaway preview send, not part of what actually went out to the real audience.
- **Draft CRUD**: "Save draft" (new) / "Update draft" / "Delete draft" buttons alongside the existing Send/Schedule buttons. Saving a new draft navigates the composer to `?draft=<id>` (via `router.push`, `next-intl`'s `useRouter`) so further edits update that same row instead of creating duplicates; the page reads that query param server-side and pre-fills the composer (including its already-uploaded image's signed URL) via a new `initialDraft` prop. The history table shows draft rows with `Edit` (a link to `?draft=<id>`) and `Delete` actions. Sending or scheduling *from* an open draft calls `update_broadcast()` instead of `record_broadcast()`, so the draft row itself becomes the sent/scheduled row rather than leaving a duplicate.
- Image upload is now lazy: a newly-picked file only actually uploads to Storage the first time it's needed (Send, Save Draft, or Test Send), not eagerly on selection — avoids uploading a file the user might still remove before doing anything with it.

**Verified against the live database and a live dev server**

- Schema: confirmed via service-role script that `tags`, `conversation_tags` exist, `broadcasts` has `template`/`link_url`/`link_label`, and `broadcast_status` accepts `'draft'`.
- RLS/RPC, signed in as the real `owner`/`agent` test accounts (not service role, so real policies actually apply): `record_broadcast` → `update_broadcast` → `delete_broadcast_draft` round-tripped a draft correctly, confirmed exactly one row throughout (no duplicate from the update), and confirmed `delete_broadcast_draft` is refused for a non-draft row. Tags: owner can create a tag; agent can read it but **cannot** create or delete one (first attempt at this check was a test-script bug — a Postgres RLS `DELETE` whose `USING` clause excludes a row matches zero rows and returns no error, so "no error" isn't proof of success; fixed by checking the row's actual continued existence via service role instead of trusting the client call's error field); both owner and agent can assign/unassign a tag on a conversation.
- Full real UI flow via Playwright against the live dev server: created a tag from the Tags admin page and confirmed it rendered in the list; opened the template picker and switched to "Image + link button," confirmed the link-label/URL fields appeared and the live preview rendered the button-card mockup correctly; saved a new draft and confirmed the URL updated to `?draft=<id>` and the history table showed an `Edit` link; reopened it and confirmed the "editing draft" banner appeared; deleted it and confirmed the URL returned to plain `/broadcast`; confirmed the test-send section's contact-picker/UID mode toggle and UID input render. Separately seeded a tagged conversation and confirmed the tag badge renders correctly in the Inbox thread header. Checked mobile (bottom nav, stacked layout), tablet, and desktop (sidebar) breakpoints, and both light/dark themes, per the project's per-screen UX checklist — all correct.
- Several of the above initially reported false failures from fixed `waitForTimeout` calls racing dev-mode Turbopack compile/navigation time, not real bugs — fixed by waiting on the actual URL/DOM state (`waitForURL`, `waitForSelector`) instead of a guessed delay, then re-confirmed passing, consistent with this project's established pattern of treating a test failure as "verify against real state first," not "assume the product is broken."
- `next build`, `tsc --noEmit`, `eslint` all clean. All test data (tags, drafts, seeded conversations) cleaned up afterward; confirmed via a final query that nothing "verify"-named was left behind.
- **Incident during this session's own tooling, not the product**: while resetting a stray background process, an overly broad `pkill -f "next dev"` killed the user's own already-running dev server (not one this session had started) instead of only the duplicate this session had just spawned. Caught immediately and the server was restarted; flagged here since a broad process-kill based on a command-line pattern match, without first identifying whose process it actually was, is exactly the kind of mistake CLAUDE.md's "investigate before deleting/overwriting" guidance is meant to prevent — worth remembering to `ps`/inspect a PID before killing by pattern in a shared or ambiguous environment.

**Open items / not built yet**

- Tag management (create/delete) is owner-only with no rename/edit-color action — a tag has to be deleted and recreated to change its color; not requested, kept scope tight.
- No pagination or paging on the contact picker's list — fine at demo scale, would need it for an org with a large number of conversations.
- Test-send's UID-resolution only ever checks the current org's own `conversations` table (the only place this app knows a LINE user's name/picture at all) — a UID for a real LINE user who has never messaged this channel will never resolve to a name, by design, exactly as scoped.
- Buttons Template's exact character-limit behavior (LINE trims the "text" field's allowed length depending on whether a thumbnail/title is present) isn't enforced client-side — LINE's API would reject an over-length message with a real error, same as every other unenforced LINE-side constraint in this project.
- Remaining open items across the whole project unchanged: "ตั้งค่าระบบ" page, `database.types.ts` regeneration, real end-to-end LINE OA verification, configuring an actual external scheduler for `/api/broadcasts/process-due`.

---

## 2026-09-23 (continued) — Phase 1, Step 21: Rich Menu + Broadcast UX overhaul — list-first pages, block-based drag-and-drop composer, action placement, Thai terminology

User flagged four UX problems across `/app` and `/admin`: list pages weren't list-first (composer and history were mashed onto one page), action buttons weren't prioritized by importance (test-send buried in the page body instead of near the top), Broadcast's template system was too rigid (no video, no visibility into the actual LINE payload, no control over element order), and some Thai copy used the wrong style of loanword ("ออกอากาศ" instead of the correct transliteration "บรอดแคสต์"). Scoped via `AskUserQuestion` to Rich Menu + Broadcast first (not every list page in the app) and to the full drag-and-drop block editor now rather than a lighter interim version.

**What was built**

- **Terminology**: every occurrence of "ออกอากาศ" in `th.json` replaced with "บรอดแคสต์" (nav label, page title, buttons, hints, the Roles page's capability description) — a straight, safe substring replace since every occurrence meant the Broadcast feature specifically.
- **List-first restructure, both features**: each now has a plain list/table page (`/app/broadcast`, `/app/rich-menu`) with a top-right "New" button, and a separate `/new` route holding the actual composer — matching the requested "list with filter/sort/search, then a button to create/edit/copy" shape instead of a composer-and-history page glued together.
  - Both list tables gained client-side search (by name/message text), a status filter, a channel filter, and a newest/oldest sort toggle — small enough datasets at this project's scale that server-side filtering wasn't worth the complexity, same reasoning already used for the contact picker.
  - **Copy**, requested as one of the example list actions, is new for both: a "คัดลอก" link on each row opens `/new?copyFrom=<id>`, which prefills the composer (Broadcast: full block list, including already-uploaded media paths, resolved to fresh signed URLs; Rich Menu: name/layout/areas — not the image, since re-validating an already-uploaded image's exact pixel dimensions doesn't cleanly fit the existing upload-and-validate flow, so a copy still needs a fresh image attached; scoped down deliberately rather than adding Storage-level image duplication).
  - Broadcast's draft edit flow (`?draft=<id>`) carried over unchanged in spirit, just moved from `/broadcast` to `/broadcast/new?draft=<id>`.
- **Action placement**: the previously page-body-buried "ส่งทดสอบ" (test send) is now a `Dialog` opened from a top-right button next to the composer's own title row, alongside a "กลับไปที่รายการ" (back to list) link — a utility action no longer competes for space with the primary compose flow. The list pages' primary "New" action sits top-right next to the page title, mirroring the already-established Admin Panel convention (e.g. Users' "Add member").
- **Broadcast block editor — the big piece**: replaced the fixed `template` enum (text / image+text / image+link) with an ordered `blocks` array (jsonb), each block one of `text` / `image` / `video` (new) / `button`. A new migration (`20260923010000_broadcast_blocks.sql`) adds the column, backfills any existing rows (none existed yet — this feature was one day old), drops the old `template`/`content`/`image_media_path`/`link_url`/`link_label` columns and the `broadcast_template` enum entirely, and re-signatures `record_broadcast`/`update_broadcast` around a single `p_blocks jsonb` param.
  - `src/lib/broadcast/blocks.ts` is the one place a block list turns into real LINE message objects (`blocksToLineMessages`) — deliberately isomorphic (no server-only imports), so the composer's live preview runs the *exact same* function client-side (with local blob:/signed preview URLs) that `send-broadcast.ts` runs server-side (with real signed Storage URLs) at actual send time, same "one conversion path" discipline established for the original template system.
  - A `button` block has no LINE message type of its own — it merges with whatever's immediately before it (an `image`, optionally with a `text` block right before *that* as caption, or a lone `text`) into a Buttons Template message, via a two-pass algorithm (decide what each button consumes, then emit in order skipping consumed blocks) so a block that's about to be absorbed by a later button doesn't also get emitted as its own message.
  - Reordering is pointer/native-drag (a plain `draggable` HTML5 list, same "no new dependency" approach as the rest of this project) plus always-available up/down buttons, since native drag-and-drop doesn't work reliably on touch without extra polyfills and this project is explicitly mobile-first.
  - The preview panel has two modes: a phone-mockup chat bubble rendering (intuitive per-block feedback, not a pixel-perfect LINE simulation) and a **JSON view** toggle showing the exact `blocksToLineMessages` output as pretty-printed JSON — the "แสดงผลเป็น json template" ask, and the actual ground truth for how button-merging resolves, which the chat mockup deliberately doesn't try to replicate visually.
  - Capped at 5 blocks (LINE's own per-message-send limit) — safe even in the worst case where no button ever consumes an adjacent block.
- Image/video uploads are lazy per-block (only uploaded the first time Send/Save Draft/Test Send actually needs them, not on file selection), tracked via a client-only `EditableBlock` type that rides `_file`/`_previewFile`/`_fileUrl`/`_previewFileUrl` alongside the real persisted fields and gets stripped before anything reaches a server action.

**A real bug caught live during verification, not in code review**: both new list pages' top-right "New" buttons render a shadcn `Button` as a `Link` via Base UI's `render` prop — but Base UI's `Button` defaults to expecting a real native `<button>` (`nativeButton: true`) and logs a console error when the actual rendered element is an `<a>` instead, since that silently drops native button semantics (forms, accessibility). This exact pattern already exists correctly elsewhere in the codebase (`sidebar-nav.tsx`, the marketing page's CTA) with `nativeButton={false}` set — missed copying that prop on these two new buttons. Playwright's console listener caught the error (surfaced as a "1 Issue" dev-tools badge) during verification; fixed by adding `nativeButton={false}` to both, re-verified zero console errors afterward.

**Verified against the live database and a live dev server**

- Schema: confirmed live that `broadcasts.blocks` exists and `template`/`content`/`image_media_path`/`link_url`/`link_label` are gone.
- **A real migration ordering bug, caught by the user pasting it into SQL Editor, not by me**: the first version dropped `broadcast_template` (the enum type) before dropping the two old-signature functions that still referenced it — Postgres correctly refused (`cannot drop type ... because other objects depend on it`). Confirmed via a live query that the whole script had rolled back atomically (SQL Editor runs a multi-statement paste as one implicit transaction) before touching anything — `template` etc. were all still intact, `blocks` didn't exist. Fixed the statement order (function drops before the type drop) and the corrected version applied cleanly.
- RPCs, signed in as the real owner account: `record_broadcast` creates a draft with a real blocks array; `update_broadcast` updates it in place; an empty blocks array is correctly rejected by the new check constraint; `delete_broadcast_draft` removes it.
- Full real UI flow via Playwright: confirmed "บรอดแคสต์" appears everywhere (and "ออกอากาศ" nowhere) on the Broadcast pages; the New button navigates to `/broadcast/new`; added a button block, confirmed the JSON view shows a real `type: "template"` Buttons Template message with the typed text and button merged together correctly; the test-send dialog opens top-right; saving a draft updates the URL to `?draft=<id>` and shows the editing banner; the list page's Edit/Copy links work and the copy flow prefills the block content; search actually filters the table; deleting a draft returns to the plain list URL. Checked mobile/dark-mode rendering on the new composer page and the desktop rich menu list — both correct.
- `next build` (all 48 routes, including the two new ones), `tsc --noEmit`, `eslint` all clean. All test data cleaned up; confirmed the broadcasts table is empty afterward.

**Open items / not built yet**

- Rich Menu's "copy" doesn't duplicate the underlying image — the composer still requires a fresh image upload even when copying, since the existing dimension-validation flow assumes a freshly-picked `File`, not an already-uploaded Storage object.
- No server-side sort/filter/pagination on either list — fine at this project's demo scale; a real high-volume org would need to move this server-side.
- The block editor's drag reordering is native HTML5 `draggable` (works on desktop; the up/down buttons are the reliable path on touch, same as this project's stated mobile-first priority) — not a polished custom-pointer drag like `RichMenuPhonePreview`'s area editor, since a 1-D list reorder didn't need that level of custom gesture handling.
- Video messages require both a video file and a separate thumbnail image upload (LINE's own requirement) — no automatic thumbnail extraction from the video itself.
- Only Rich Menu and Broadcast got this treatment, as scoped — Inbox, Reports, and every Admin Panel list page (Users, Tags, LINE Channels, Audit Log) still use their original layouts.
- Remaining open items across the whole project otherwise unchanged (see previous entries).

---

## 2026-09-23 (continued) — Phase 1, Step 22: Imagemap + Flex Message blocks, editable Monokai JSON popup, preview capture-to-image, LINE-style mockup

User asked for three more things on top of Step 21's block editor: (1) images that carry their own tap action, explicitly wanting the same drag-to-draw UX as the Rich Menu page — confirmed via research that this is LINE's **Imagemap Message** (one image, rectangular pixel regions, structurally identical to a Rich Menu) — plus a full **Flex Message** builder (confirmed via `AskUserQuestion`: the full custom box/component tree, not a fixed template); (2) the JSON view turned into an editable popup, styled like VS Code's Monokai theme, that writes back to the form; (3) a "capture as image" button on the preview, the preview itself looking more like a real LINE chat, and a check on whether Broadcast and Rich Menu use consistent preview terminology (they didn't — see below).

**What was built**

- **Two new block types**, added to the *same* `blocks` jsonb column from Step 21 — no new migration needed, since it was already schemaless-by-design for exactly this kind of extension:
  - `imagemap`: `{ mediaPath, altText, aspectRatio, areas: [{ x, y, width, height, action }] }`. The area editor is **`RichMenuPhonePreview` reused directly**, not rebuilt — Imagemap's "one image + rectangular tap regions" is structurally the same problem Rich Menu's custom layout already solves, so `ImagemapEditor` just wraps it with alt-text/action fields per region. Areas are stored as percentages (consistent with Rich Menu's own convention) and converted to LINE's pixel `area` object against a declared `baseSize` (1040 wide, height from the image's own aspect ratio) at send time.
  - `flex`: `{ altText, hero, body, footer }`, each a small recursive component tree (`box` / `text` / `image` / `button` / `separator`). Scoped to what covers most real Flex messages — carousels, the `header` slot, and `icon`/`span`/`video` components weren't built. `FlexEditor` renders hero as a single optional actionable image and body/footer as nested `box` editors using the same up/down/remove list pattern as the flat block editor, just applied recursively — a flex `image` component's `action` is exactly the "image with its own tap action" the user asked for, independent of imagemap.
  - Both convert to real LINE message objects in the same `blocksToLineMessages` function from Step 21 (kept as the one place this happens, run identically client-side for preview and server-side for send).
- **Imagemap's `baseUrl` problem, solved with a new public route**: LINE's own servers fetch `{baseUrl}/{width}` directly, potentially long after send and repeatedly — a signed Storage URL (1hr expiry) can't work here. New `/api/imagemap/[...path]/route.ts`, a public (unauthenticated) route — same category of necessary exception as the LINE webhook route — that reads the image from the private `line-media` bucket via the service-role client and streams it back regardless of the requested width suffix. This satisfies LINE's URL-shape contract but doesn't do real per-width image resizing (no image-processing dependency in this project); noted as a scoped-down simplification, not silently pretended away.
- **Editable Monokai JSON popup**: the former inline JSON toggle is now a `Dialog` (`JsonEditorDialog`) with a hand-built syntax-highlighted editor (`MonokaiJsonEditor` — a highlighted `<pre>` layer behind a transparent-text `<textarea>`, the standard lightweight-editor technique, avoiding a real code-editor dependency for one popup) styled with Monokai's actual palette (`#272822` background, pink keys, yellow strings, purple numbers, cyan booleans/null). It edits the composer's own **block structure**, not LINE's derived message payload — reversing an already-merged Buttons Template back into discrete blocks isn't a sound round trip, so editing the blocks themselves (which the composer already treats as its source of truth) is the correct, lossless target. Saving re-parses, does a light shape check (non-empty array, each item has `id` + a known `type`), and replaces the composer's state — an already-uploaded media path keeps its preview via a new `collectMediaUrlMap` lookup built from current state; a hand-typed new path just won't have one until re-attached normally.
- **Preview polish**: the phone mockup now looks like an actual LINE chat screen — a green header bar with a back arrow, the connected channel's initial as a circular avatar, the channel name, and a menu icon; a light gray chat background; a small OA avatar next to each message bubble — instead of the earlier generic gray mockup.
- **Capture preview as image**: a "บันทึกเป็นรูปภาพ" button renders the phone mockup DOM node to a PNG and downloads it. Originally built with `html2canvas`, which turned out to hard-fail (`Attempting to parse an unsupported color function "lab"`) on this Tailwind v4 theme's `oklch()`/`lab()` CSS custom properties — a known, long-standing html2canvas limitation (it re-implements CSS color parsing itself rather than delegating to the browser). Swapped to `modern-screenshot` (SVG-foreignObject-based, so it renders through the browser's own engine instead of re-parsing CSS), confirmed working.
- **Terminology consistency**: Rich Menu's preview was already labeled "พรีวิว"; Broadcast's was "ตัวอย่าง" — same concept, different word, exactly the inconsistency the user asked to check for. Unified both to "พรีวิว".

**Two real bugs caught live during verification, not in code review**

- The `html2canvas` CSS-parsing failure above — caught by checking the browser console during a failed capture attempt (a silently-swallowed `try/finally` had hidden it from the UI entirely; the download simply never happened). Root-caused precisely (not just "it doesn't work") before picking a fix, and confirmed the replacement actually produces a valid, correctly-rendered PNG (checked the PNG file signature directly and visually inspected the captured image).
- The download-triggering `<a>` element was created and clicked without ever being attached to the document — worked inconsistently; fixed by appending it to `document.body` before `.click()` and removing it after, the standard robust pattern.

**A test-script false negative correctly ruled out, not "fixed" by changing product code**: a live DB round-trip check first reported `JSON.stringify(sent) !== JSON.stringify(received)` for a broadcast with imagemap+flex blocks — the same category of jsonb-key-reordering artifact documented in earlier steps (Postgres's jsonb type doesn't preserve object key order). Confirmed via a proper structural deep-equality check that the data was in fact identical; not a real bug.

**Verified against the live database and a live dev server**

- DB: `record_broadcast` accepts and correctly persists a real imagemap block (with a region + action) and a real flex block (hero image + body text + footer button) through the *existing* jsonb column and RPCs — no schema change needed, confirming the Step 21 design was genuinely extensible.
- Full real UI flow via Playwright: added an Imagemap block, attached a real image, drew a tap region by dragging on the reused Rich Menu canvas (first attempt using Playwright's synthesized mouse events silently failed to trigger the app's pointer handlers — confirmed via a standalone repro with directly-dispatched `PointerEvent`s that the app's own logic works correctly; fixed the test script, not the product), and confirmed the action field appeared; added a Flex block with a hero image, body text, and footer button; opened the JSON popup and confirmed both new block types appear correctly with Monokai syntax highlighting; edited the JSON directly and confirmed saving updated the actual form fields; clicked capture-to-image and confirmed a real, correctly-rendered PNG downloads; confirmed "พรีวิว" (not "ตัวอย่าง") appears consistently.
- `next build` (all 48 routes, including the new public imagemap route), `tsc --noEmit`, `eslint` all clean throughout. All test data cleaned up; confirmed the broadcasts table is empty afterward.

**Open items / not built yet**

- Imagemap's `baseUrl` serves the original image at every requested width rather than real per-width resizes — functionally correct, not bandwidth-optimized the way LINE intends; would need an image-processing step (e.g. `sharp`) to do properly.
- Flex Message carousels (multiple bubbles, swipeable), the `header` slot, and `icon`/`span`/`video` components aren't built — scoped to the box/text/image/button/separator set that covers most real usage.
- The JSON popup edits the composer's block structure, not LINE's literal outbound message JSON — a deliberate, explained trade-off (the only sound lossless round trip), not an oversight.
- Capture-to-image was added to Broadcast's preview only, as literally requested — Rich Menu's own preview doesn't have it yet; would be a natural, small follow-up for full consistency between the two pages.
- Remaining open items across the whole project otherwise unchanged (see previous entries).

---

## 2026-09-23 (continued) — Phase 1, Step 23: Unify Image/Imagemap into one block, fix a real drag-and-drop bug

User asked three follow-up questions about Step 22 that turned into real changes: (1) wanted the plain "รูปภาพ" block to optionally carry its own single tap action, the same way Flex's image component already can; (2) asked directly whether "รูปภาพ" and "Imagemap" should really be two separate block types or unified into one — decided yes, unify, since "an image with zero/one/many tap zones" is one concept, not three; (3) reported that Imagemap was actually unusable — dragging on the image to draw a tap region moved the whole block instead.

**What was built**

- **Image block, three modes, one block type**: `image` now carries `mode: "plain" | "action" | "regions"` plus the fields each mode needs (`action` for a single Buttons-Template-style tap action; `altText`/`aspectRatio`/`areas` for Imagemap-style regions). The standalone `imagemap` block type is gone — folded entirely into `image`. No migration needed: `blocks` was already a schemaless jsonb array from Step 21, so this was purely an application-layer type/UI change.
  - New `ImageBlockFields` component replaces the old split between a plain "attach image" field and a separate `ImagemapEditor` — one shared image-attach control up top, a small three-way mode selector, then mode-specific fields below (nothing extra for "plain"; label/type/URL for "action"; alt text + the reused Rich Menu area-drawing canvas + a per-region list for "regions").
  - `blocksToLineMessages` (`src/lib/broadcast/blocks.ts`) now branches on `image.mode`: plain → ordinary `image` message; `action` → a Buttons Template with just a thumbnail (no separate button block needed anymore, though the existing image+button merge behavior for *plain*-mode images is untouched, so that route still works too); `regions` → the same Imagemap Message construction as before.
- **Real bug fix — nested drag conflict**: `BlockEditor`'s per-block card had `draggable={true}` on the *entire* card (for whole-block reordering), which — per HTML5 drag-and-drop semantics — hijacks any drag gesture starting anywhere inside it, including the pointer-based area-drawing canvas nested inside an Imagemap-mode image block. Trying to draw a region was being interpreted as "start dragging the whole block" instead. Fixed by moving `draggable`/`onDragStart`/`onDragEnd` onto *just* the grip-handle icon, leaving `onDragOver`/`onDrop` (valid drop-target listeners, unaffected by this issue) on the full card. Whole-block reordering via the handle still works; the nested canvas's own pointer handling is no longer hijacked.

**Verified against a live dev server**

- Confirmed "Imagemap" no longer appears as its own block-type button — only one unified "รูปภาพ" entry.
- Added an image block, attached a real photo, confirmed all three mode buttons render and switching to "action" mode shows label/type/URL fields.
- Switched to "regions" mode and **reproduced the exact reported bug first** (before the fix, dragging on the canvas moved/reordered the block instead of drawing a region — confirmed via the same live dev server), then confirmed after the fix that dragging on the canvas correctly draws a tap region, the block itself stays in place, and the live preview reflects the drawn region overlay.
- Confirmed whole-block reordering via the grip handle still works (regression check) — dragging the handle itself still functions as a native drag source.
- `next build`, `tsc --noEmit`, `eslint` all clean. No DB changes, no test data to clean up (nothing was ever submitted during this verification pass).

**Open items / not built yet**

- Remaining open items across the whole project otherwise unchanged (see previous entries).

---

## 2026-09-23 (continued) — Phase 1, Step 24: Capture-to-image for Rich Menu's preview too

Picked up the first item from Step 22's own "open items" list — Rich Menu's preview didn't have the same "save as image" button Broadcast's did, an inconsistency flagged as a natural follow-up at the time.

**What was built**

- `captureElementAsPng(element, filename, scale)` extracted into `src/lib/capture-element.ts` — the render-to-PNG-and-download logic was about to exist in two places verbatim; factored out once instead, and `BroadcastPreviewPanel` was updated to call it too rather than keeping its own copy.
- `RichMenuComposer`'s preview panel gained the same header-row "บันทึกเป็นรูปภาพ" button as Broadcast's, wrapping `RichMenuPhonePreview` in a capture ref.

**Verified against a live dev server**: clicked the button on `/app/rich-menu/new`, confirmed a real PNG downloads (checked the file signature and viewed it — a correct rendering of the phone mockup, including the "2500 × 1686" placeholder text for the not-yet-uploaded background image). `next build`, `tsc --noEmit`, `eslint` all clean.

**Open items / not built yet**

- Remaining open items across the whole project otherwise unchanged (see previous entries).

---

## 2026-09-23 (continued) — Phase 1, Step 25: Filter/search/sort for the remaining Admin list pages

Continuing Step 21's list-first pattern to the rest of the Admin Panel, scoped via `AskUserQuestion` to just adding filter/search/sort (not restructuring create flows into separate `/new` routes — Users/Tags already use a Sheet-based add flow, which doesn't have the composer-and-list-crammed-together problem Rich Menu/Broadcast had).

**What was built**

- **Users** (`UsersTable`): search by email/name, role filter (all/owner/agent/analyst), newest/oldest sort.
- **Tags** (`TagManager`): search by name only — a flat wrapped badge list already sorted alphabetically by the query, so no separate sort control; filter doesn't apply (no categorical dimension).
- **Audit Log** (`AuditLogTable`): search by actor or target, an action-type filter (all 8 known action kinds), newest/oldest sort — the strongest candidate of the four, since this table only grows over time.
- **LINE Channels — deliberately skipped**: an org typically has 1-3 connected channels (each requires a real external LINE OA signup), so filter/search UI here would be pure clutter with no real value at this scale.

**Verified against the live database and a live dev server**

- Users: confirmed the search input filters the live table (owner/agent/analyst test accounts), and clearing it restores the full list.
- Tags and Audit Log were empty in the live DB, so seeded two real tags and two real audit_log rows via the service role to verify the filter UIs render and actually filter (not just that the controls exist) — confirmed search narrows the tag list correctly (including the "no matches" empty state), and confirmed the audit log's action-type filter correctly shows only matching entries and hides non-matching ones. All seeded test data cleaned up afterward; confirmed empty again.
- `next build`, `tsc --noEmit`, `eslint` all clean throughout.

**Open items / not built yet**

- Remaining open items across the whole project otherwise unchanged (see previous entries).
