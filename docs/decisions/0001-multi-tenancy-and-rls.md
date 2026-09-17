# 0001: Multi-tenancy model and RLS design

**Status:** Accepted
**Date:** 2026-09-17

## Context

This platform serves multiple client organizations from one deployment, each with their own LINE OA channel(s) and users (owner / agent / analyst). CLAUDE.md flags tenant data isolation as the #1 risk area for this kind of system, so the schema needs to make cross-tenant data leaks structurally hard, not just something application code has to remember to filter for.

## Decision

- **`organizations`** is the tenant root. Every tenant-scoped table carries an `organization_id` foreign key into it.
- **`profiles`** mirrors `auth.users` 1:1 (`id` is a foreign key to `auth.users.id`), holding non-auth profile data. A profile is not org-scoped by itself — the same user could belong to more than one organization.
- **`organization_members`** is the join table between users and organizations, carrying the per-organization `role` (`owner` / `agent` / `analyst`). A user's role is a property of their *membership*, not of the user globally, since the same person could be an owner of one org and an agent in another (e.g. an agency managing client accounts).
- **`audit_log`** is append-only (no client-facing update/delete policy) and org-scoped, per the Admin Panel's audit log requirement.
- Every tenant-scoped table has Row Level Security enabled, with policies keyed off organization membership rather than trusting the application layer to filter by `organization_id` on every query.
- Two `SECURITY DEFINER` SQL functions, `is_org_member(org_id)` and `is_org_owner(org_id)`, back most policies. A naive RLS policy on `organization_members` that queries `organization_members` itself (even via a subquery) recurses into its own policy check. Routing the lookup through a `SECURITY DEFINER` function sidesteps this: the function's internal query bypasses RLS, so it terminates instead of recursing. This is the standard Supabase-recommended pattern for this exact problem.
- Organization creation and the first membership row are bootstrapped by triggers (`handle_new_user` on `auth.users` insert, `handle_new_organization` on `organizations` insert), not application code, so an organization can never exist without an owner and a user can never exist without a profile — the invariant holds regardless of which client code path creates the row.

## Consequences

- Any new tenant-scoped table must add an `organization_id` column and RLS policies using `is_org_member`/`is_org_owner` following this same pattern — that's the checklist for every future migration, not just this one.
- Because policies check real membership rows rather than a JWT claim, revoking a member's access takes effect immediately (no stale claims to wait out), at the cost of one extra lookup per policy check.
- LINE channel credentials (channel ID/secret/access token) are deliberately **not** part of this migration. They'll live in their own org-scoped table when LINE integration is built, with the token columns encrypted at rest per CLAUDE.md — that's a separate decision when it happens.
- This migration has been syntax-checked against the Postgres grammar (via `libpg-query`) but **not executed against a live database** — this environment has neither Docker nor a local Postgres install, so `supabase start` / `supabase db push` couldn't be run here. Whoever connects the first real Supabase project should run the migration there as the first real test and treat that as unverified until it passes.
