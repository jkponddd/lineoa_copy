# 0002: Auth approach

**Status:** Accepted
**Date:** 2026-09-17

## Context

Phase 1 Step 2 shipped the multi-tenancy schema and RLS policies (see [0001](./0001-multi-tenancy-and-rls.md)), but nothing enforced who could reach `/app` or `/admin`, or connected a logged-in user to an organization. This step wires up Supabase Auth end to end: sign up, log in, session handling, and getting a brand-new user into their first organization.

## Decision

- **Email + password**, chosen over magic links or OAuth for this step — no extra provider setup, most control, matches a standard B2B admin panel.
- **Session refresh lives in `src/proxy.ts`** (Next.js's middleware, renamed per the Next 16 "proxy" convention), combined with next-intl's locale routing in one function — Next.js only allows one middleware file, so the two responsibilities that were previously separate had to be merged. `updateSession()` (`src/lib/supabase/middleware.ts`) refreshes the Supabase session cookie on every request, per Supabase's documented SSR pattern.
- **Two-tier route protection:**
  1. `proxy.ts` does a cheap, session-only check: unauthenticated + hitting `/app` or `/admin` → redirect to `/login`. No DB query here, just whether a session exists — keeps the middleware fast.
  2. `(app)/layout.tsx` and `(admin)/layout.tsx` do the DB-backed check: authenticated but no organization membership → redirect to `/onboarding`; authenticated, has an org, but not `owner` → redirect away from `/admin` to `/app`. This needs a real query (`getCurrentMembership()`), so it belongs in the layout, not the middleware, to avoid a DB round-trip on every single request regardless of route.
- **Admin Panel is owner-only.** The product overview describes it as org/user/role/billing/settings management — agents and analysts get bounced to `/app`. This is a judgment call, not spelled out explicitly in CLAUDE.md; revisit if the product actually needs finer-grained admin access later.
- **First organization is created through onboarding, not signup.** A new user has a profile but no org until they explicitly create one at `/onboarding` — this reuses the `handle_new_organization` trigger from migration 1 (auto-adds the creator as `owner`), rather than adding new server-side logic to do the same thing.
- **A user's "active" organization is just their first membership row.** There's no org-switcher UI yet (a user belonging to multiple orgs is allowed by the schema, but nothing here lets them pick which one is "active"). `getCurrentMembership()` in `src/lib/supabase/get-current-membership.ts` picks the first row arbitrarily. Revisit when multi-org switching is built.

## Consequences

- Any new protected route under `/app` or `/admin` is covered by the existing layout guards automatically — no new route needs its own auth check.
- A route that needs finer-grained permission logic (e.g. "agents can view but not edit billing") isn't covered by this — the owner/non-owner split at the layout level is coarse by design, and per-feature checks will need to happen in those features when they're built.
- Because `redirect()` (from `next-intl`'s navigation helpers, which wrap `next/navigation`) is typed to return `never`, but TypeScript's narrowing didn't reliably treat code after a guard-clause call to it as unreachable in this codebase (confirmed via isolated repro — a plain `() => never` function narrows fine, but this one, returned from a generic factory function, didn't), every guard clause that calls `redirect()` and needs the caller's later code to see a narrowed type has an explicit `return null;` (or equivalent) immediately after it. It's dead code at runtime (the call already throws), but it's the difference between the file type-checking or not.
- This migration/step has been tested against the real, live Supabase project (not just syntax-checked) — see the PROGRESS.md entry for what was actually exercised end to end.
