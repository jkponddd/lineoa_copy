# Project: LINE OA Management Platform (Reusable SaaS Template)

This file contains persistent rules for Claude Code on this project. Read and follow these on every task, every session — do not ask me to repeat them.

## Product Overview
A reusable, sellable SaaS template for managing LINE Official Accounts (LINE OA).
Three surfaces in one codebase:
- **Homepage** — public marketing site (used to sell/showcase the template)
- **User App** — inbox (view/reply LINE messages), reports/analytics, broadcast, rich menu builder. Role-based access (owner / agent / analyst).
- **Admin Panel** — organization & user management, role management, billing, system settings, audit log.

Architecture target: multi-tenant (one deployment can serve multiple client organizations, each with their own LINE OA channel(s)).

## Tech Stack
- Next.js (App Router) + React + TypeScript
- Supabase: Auth, Postgres + Row Level Security (RLS), Realtime, Storage
- Tailwind CSS + shadcn/ui as the component base
- next-intl (or equivalent) for i18n
- LINE Messaging API (webhook + push/reply)

## UX/UI Requirements — apply to every screen, no exceptions

1. **Light / Dark mode**
   - Every page must support both. Use Tailwind `dark:` classes / CSS variables — never hardcode colors.
   - Default follows system preference (`prefers-color-scheme`), with a manual toggle available to the user.

2. **i18n — Thai (th) and English (en)**
   - All user-facing text goes through translation keys. Never hardcode visible strings in components.
   - Language switcher must show country flag icons (flag SVG set matching flagpedia.net style — TH/GB flags), not emoji flags.
   - Default language: Thai, with easy switch to English.

3. **Responsive — app-like behavior on mobile/tablet, simple on desktop**
   - **Mobile & tablet**: fixed bottom navigation bar (like a banking app), with a clear, prominent primary action button for the main task on that screen (e.g. "reply", "broadcast", "add").
   - **Desktop**: simplified layout using a sidebar (not a forced bottom bar) — optimize for ease of navigation, not for mimicking mobile.
   - Every new screen must be checked at mobile / tablet / desktop breakpoints before being considered done.

4. Build on **shadcn/ui** components as the base layer; keep a consistent design token set (colors, spacing, radius) across Homepage / User App / Admin Panel so the product feels like one system, not three.

## Workflow Rules — apply after every piece of work

1. **After finishing any code change or feature:**
   - Give me a short, conventional commit message (e.g. `feat: add inbox realtime message list`). **Do not run `git commit` yourself** — I commit manually.
   - Suggest a short list (2-4 items) of recommended next steps, then ask whether to go ahead with one ("ทำต่อเลยมั้ย?" / continue now?) and **stop**. Wait for my reply before starting the next task. Never auto-continue to the next feature on your own.

2. **After every completed task**, create or update a markdown status file (see below) summarizing what was built, key decisions made, and what's left open. Treat it as a running project log, not a one-time doc.

3. If a task is ambiguous or spans multiple features, confirm the scope with me before starting, rather than guessing and building something large.

## Docs & Files to Maintain

- `CLAUDE.md` — this file. Only update it if project rules actually change (rare).
- `PROGRESS.md` — running log at repo root. Append a new dated entry after every session: what was done, decisions made, open items.
- `docs/decisions/` — short ADR-style notes for big architecture calls (e.g. multi-tenancy model, RLS design, i18n library choice). Create one file per decision when it happens.

## Notes on Multi-tenancy (keep in mind while building)

- Every data table that holds tenant data must carry an `organization_id` and be protected by Supabase RLS — this is the #1 risk area for this kind of system.
- LINE webhook events must be routed to the correct organization using the LINE Channel ID in the payload.
- LINE channel tokens/secrets must be stored encrypted, never in plaintext columns or client-exposed code.
