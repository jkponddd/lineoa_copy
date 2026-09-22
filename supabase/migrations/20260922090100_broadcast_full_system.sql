-- Broadcast, extended to the full system requested: images, scheduled
-- send, and audience segmentation.
--
-- Audience: 'all' still goes out via LINE's Broadcast API (fans out to
-- every follower, as before). 'conversations' is new — sent via LINE's
-- Multicast API to the distinct line_user_ids in this channel's own
-- `conversations` table (people who have actually messaged in), batched at
-- 500 recipients per call (LINE's own multicast limit). No new recipient-
-- lookup function needed: the existing "Members can view their
-- organization's conversations" RLS policy already lets an org member's
-- own session read line_user_id directly when sending immediately; the
-- scheduled-send route (service role, no user session) reads it unscoped
-- the same way service role reads everything.
--
-- Scheduling: `scheduled_at` null means "send immediately" (the original
-- behavior). A new status enum value 'scheduled' means "queued, not sent
-- yet" and 'sending' is a short-lived claim state so the cron-triggered
-- route (src/app/api/broadcasts/process-due) can't double-send if two
-- invocations ever overlap — see that route for the claim-then-process
-- pattern.
create type public.broadcast_audience as enum ('all', 'conversations');

alter table public.broadcasts add column scheduled_at timestamptz;
alter table public.broadcasts add column audience public.broadcast_audience not null default 'all';
alter table public.broadcasts add column image_media_path text;

-- content was NOT NULL for the text-only original design; an image-only
-- broadcast has no text, so this relaxes to "at least one of the two."
alter table public.broadcasts alter column content drop not null;
alter table public.broadcasts add constraint broadcasts_content_or_image check (
  content is not null or image_media_path is not null
);

-- record_broadcast's signature is changing (three new params) — drop the
-- old overload explicitly, same reason as every other signature change in
-- this project (create or replace with a different parameter list creates
-- a second overload instead of replacing the first).
drop function if exists public.record_broadcast(uuid, text, public.broadcast_status, text, uuid);

create or replace function public.record_broadcast(
  p_line_channel_id uuid,
  p_content text,
  p_image_media_path text,
  p_audience public.broadcast_audience,
  p_scheduled_at timestamptz,
  p_status public.broadcast_status,
  p_error_message text,
  p_sent_by uuid
)
returns public.broadcasts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_broadcast public.broadcasts;
begin
  select organization_id into v_organization_id from public.line_channels where id = p_line_channel_id;

  if v_organization_id is null then
    raise exception 'LINE channel not found';
  end if;

  if not public.is_org_member(v_organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  insert into public.broadcasts (
    organization_id, line_channel_id, content, image_media_path, audience,
    scheduled_at, status, error_message, sent_by
  ) values (
    v_organization_id, p_line_channel_id, p_content, p_image_media_path, p_audience,
    p_scheduled_at, p_status, p_error_message, p_sent_by
  )
  returning * into v_broadcast;

  return v_broadcast;
end;
$$;

revoke execute on function public.record_broadcast(
  uuid, text, text, public.broadcast_audience, timestamptz, public.broadcast_status, text, uuid
) from public, anon;
grant execute on function public.record_broadcast(
  uuid, text, text, public.broadcast_audience, timestamptz, public.broadcast_status, text, uuid
) to authenticated;

-- Lets an org member cancel a broadcast that's still waiting to go out.
-- Only removes rows still in 'scheduled' — once the cron route has claimed
-- one (status='sending') or it's already resolved (sent/failed), it's too
-- late to cancel.
create or replace function public.cancel_scheduled_broadcast(p_broadcast_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id
  from public.broadcasts
  where id = p_broadcast_id and status = 'scheduled';

  if v_organization_id is null then
    raise exception 'Broadcast not found or no longer cancelable';
  end if;

  if not public.is_org_member(v_organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  delete from public.broadcasts where id = p_broadcast_id;
end;
$$;

revoke execute on function public.cancel_scheduled_broadcast(uuid) from public, anon;
grant execute on function public.cancel_scheduled_broadcast(uuid) to authenticated;
