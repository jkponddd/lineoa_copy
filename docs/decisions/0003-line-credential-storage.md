# 0003: LINE channel credential storage

**Status:** Accepted
**Date:** 2026-09-17

## Context

CLAUDE.md is explicit: "LINE channel tokens/secrets must be stored encrypted, never in plaintext columns or client-exposed code." A LINE Messaging API channel has two secrets — the Channel Secret (used to verify webhook signatures) and the Channel Access Token (used to call LINE's REST API to send messages) — and both need to be readable by our server (to verify incoming webhooks and to send messages) but never readable by the browser, and not even trivially readable by an org owner poking around the database.

## Decision

- **Supabase Vault** (`vault.create_secret` / `vault.decrypted_secrets`, backed by `pgsodium`) stores the actual secret values, encrypted at rest. `public.line_channels` only stores `channel_secret_id` / `channel_access_token_id` — foreign keys into `vault.secrets`, never the values themselves. Chosen over hand-rolling `pgcrypto` symmetric encryption because Vault is the Supabase-native, purpose-built tool for exactly this (encrypted app secrets), and key management is handled by Supabase rather than us having to store and rotate our own encryption key.
- **Three SECURITY DEFINER functions are the only way to touch this table's secrets** — there are deliberately no direct insert/update/delete RLS policies on `line_channels` itself:
  - `create_line_channel(...)` — callable by `authenticated`. Re-checks `is_org_owner()` itself (SECURITY DEFINER bypasses RLS, so the function has to do its own authorization, the same pattern as `handle_new_organization` from migration 1).
  - `get_line_channel_secrets(...)` — decrypts and returns both secrets. **Grant is `service_role` only** — `authenticated` and `anon` are explicitly revoked. This is the key property: even the organization's own owner, using their own logged-in session, cannot call this function and get the plaintext secrets back. Only trusted server-side code running with the service role key (the webhook handler, the push-message sender) can ever see a decrypted value.
  - `delete_line_channel(...)` — callable by `authenticated`, re-checks ownership, cleans up the Vault rows too (`channel_secret_id`/`channel_access_token_id` have `on delete restrict`, so a channel can't be deleted without going through this and explicitly removing its secrets).
- Members (any role) can `select` from `line_channels` directly — they see the metadata (display name, LINE Channel ID, timestamps), never the secrets, which aren't columns on this table in the first place.

## Consequences

- Any code that needs the actual secret/token (the webhook route, a push-message sender) must run with the service role key, not the normal per-request user session client. This means a dedicated service-role Supabase client is needed alongside the existing browser/server (anon + user session) clients — see `src/lib/supabase/service-role.ts`.
- This was tested against the live database, not just written and assumed correct (see the PROGRESS.md entry for this step): confirmed a non-owner is blocked from creating a channel, an owner can, the secret never appears in the plaintext row, members can see metadata, an owner's own session is blocked from decrypting secrets, `service_role` can decrypt correctly, an anonymous request sees nothing, and deletion cleans up the Vault rows.
- If Vault turns out to be unavailable on some future self-hosted or older Supabase instance, this whole design needs revisiting (it's a hard dependency, not a fallback-able one) — noted here in case that ever comes up, though it hasn't been a problem on this project.
