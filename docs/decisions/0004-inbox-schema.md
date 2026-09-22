# 0004: Inbox schema — conversations, messages, media storage

**Status:** Accepted
**Date:** 2026-09-22

## Context

The Inbox feature needs to persist LINE conversations (one per LINE end-user per channel), the messages in them (inbound from the LINE user, outbound from an agent), support assigning a conversation to a specific org member, and handle image messages — all multi-tenant, scoped by `organization_id`, per CLAUDE.md's #1 risk area.

## Decision

- **`conversations`** — one row per `(line_channel_id, line_user_id)` pair (unique constraint), so a returning LINE user's messages land in the same thread rather than creating duplicates. Carries `organization_id` directly (denormalized from `line_channels`) so RLS policies don't need a join to `line_channels` on every check. `assigned_to` references `auth.users`, nullable (unassigned by default, per the confirmed scope). `last_message_at` is kept in sync by a trigger (`touch_conversation_on_message`) so the inbox list can sort by it directly instead of a correlated subquery per row.
- **`messages`** — `direction` (`inbound`/`outbound`) and `type` (`text`/`image`, per the confirmed initial scope). A check constraint enforces `content` for text rows and `media_path` for image rows, so a row can never claim a type it doesn't have data for. `line_message_id` is unique (partial index, nulls excluded) so a retried webhook delivery is a no-op instead of a duplicate.
- **Write paths are all through SECURITY DEFINER functions, not direct table inserts** — same pattern as `line_channels` (see [[0003-line-credential-storage]]):
  - `upsert_conversation_for_webhook` / `insert_inbound_message` — service_role only, called by the webhook handler. Split into two functions (rather than one, as was tried first) because an image message's Storage path needs the conversation's `organization_id`/`id` before the message row referencing that path can be inserted.
  - `record_outbound_message` — `authenticated`, called by a server action *after* the message has already been pushed through the LINE API successfully. This ordering matters: a row is never written claiming to be sent when the LINE API call actually failed.
  - `assign_conversation` — `authenticated`, re-checks the assignee is actually a member of the same organization (an RLS update policy can't express a check against a *different* row's `organization_id`).
- **Media storage**: a private Supabase Storage bucket (`line-media`), never public. Object paths are `{organization_id}/{conversation_id}/{filename}` — the leading `organization_id` segment is what the bucket's RLS policies check via `storage.foldername(name)`, reusing the same `is_org_member()` helper as every other table. Reads (both for displaying an image in the thread and for LINE to fetch an outbound image) go through **signed URLs**, generated on demand — never a public URL, since customer-sent photos can be sensitive.
- **Realtime**: `conversations` and `messages` are added to the `supabase_realtime` publication. The client subscribes using the logged-in user's own session (not service role), so Postgres's RLS select policies are what actually gate which change events a given browser receives — an agent can't receive realtime events for another organization's conversations even if they knew the channel name.

## Consequences

- Sending an outbound image requires two Storage round trips server-side: one signed URL for LINE to fetch the image from, generated with the service-role client (since `get_line_channel_secrets`-style decryption already requires it for the access token). The agent's browser uploads directly to Storage first (covered by the bucket's own `authenticated`-scoped insert policy), so the image bytes never pass through our server.
- `line_channels.id` (uuid) is what `conversations.line_channel_id` references — *not* LINE's own numeric Channel ID. Sending a reply therefore needs a lookup (`getLineChannelAccessTokenByChannelUuid`) to go from that uuid to the numeric Channel ID before it can call `get_line_channel_secrets`. This mirrors the `bot_user_id` vs. Channel ID distinction from [[0003-line-credential-storage]] — two different "channel identifier" concepts, used in different directions (webhook routing vs. outbound send), and worth keeping straight rather than trying to collapse into one id.
- Not yet built: read/delivery receipts, conversation `status` (`open`/`closed`) has a column and enum but no UI to change it yet, message types beyond text/image (video/audio/file/sticker/location all arrive through the same webhook shape but are currently silently ignored).
