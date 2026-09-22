# 0006: Broadcast scheduling mechanism and audience segmentation

**Status:** Accepted
**Date:** 2026-09-22

## Context

Broadcast originally sent a text message immediately, to every follower of a channel, via LINE's Broadcast API. The user asked for the full system: images, scheduled send, and audience segmentation, together.

Two design questions needed answers before writing code:

1. This is a serverless Next.js app with no persistent background worker. How does a "scheduled" broadcast actually get sent at the right time?
2. LINE's Broadcast API sends to *everyone* — there's no way to narrow it from LINE's side. What does "segment the audience" even mean without a whole tagging/CRM system?

## Decision

**Scheduling**: an external-trigger route, not an in-process timer. `POST`/`GET /api/broadcasts/process-due` finds every `broadcasts` row with `status = 'scheduled'` and `scheduled_at <= now()`, claims each one (`scheduled → sending`, conditioned on still being `scheduled`, so two overlapping calls can't double-send), sends it, and records the result. It does nothing on its own — something external has to call it on an interval. Protected by a `CRON_SECRET` bearer token, matching Vercel Cron Jobs' own convention (it auto-sends that header when the env var is set), with a `?secret=` query-param fallback for schedulers that can't set custom headers. This keeps the template host-agnostic — Vercel Cron, a plain cron job with `curl`, GitHub Actions on a schedule, or Supabase's own `pg_cron` calling out via `pg_net` all work the same way, at the cost of the user needing to actually configure one (documented, not automatic).

**Audience**: two options, not a general segmentation system. `'all'` is unchanged (LINE's Broadcast API). `'conversations'` is new: LINE's **Multicast** API, targeting the distinct `line_user_id`s already sitting in that channel's own `conversations` table — the same "who has an existing conversation" concept the rest of the product (Inbox, Reports) already understands, rather than inventing tags, lists, or a CRM-style segment builder. This is a deliberately narrow answer to "segmentation" — a real audience-builder is a much bigger feature that would need its own scoping conversation.

## Consequences

- The "send now" server action and the cron-triggered route must never diverge on what a broadcast actually sends or how a given audience resolves to recipients — both call the same `performBroadcastSend`/`buildBroadcastMessages` functions in `src/lib/broadcast/send-broadcast.ts` rather than each having their own copy of that logic.
- A broadcast scheduled with `audience: 'conversations'` reflects who was in `conversations` *at send time*, not at scheduling time — if new conversations start between scheduling and sending, they're included; the list isn't frozen when the broadcast is created.
- The scheduling feature is genuinely inert until the user configures an external scheduler. This was flagged clearly rather than silently shipping a "Schedule" button that queues things forever — the route itself was verified live (claimed and processed a due broadcast for real), but "something calls it periodically" is infrastructure outside this codebase's control.
- If a future step wants real audience segmentation (tags, saved filters, CSV import), it likely needs its own table and its own scoping — the `broadcast_audience` enum would need a third value and a very different recipient-resolution path, not an extension of the current two-value design.
