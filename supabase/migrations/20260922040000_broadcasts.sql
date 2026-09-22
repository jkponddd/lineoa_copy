-- Broadcast: send a text message to every follower of a connected LINE OA
-- channel via LINE's actual Broadcast API (not our own recipient list —
-- LINE fans it out to everyone who's added the channel as a friend,
-- regardless of whether they've ever messaged in, so this is intentionally
-- NOT scoped to rows in `conversations`).

create type public.broadcast_status as enum ('sent', 'failed');

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  line_channel_id uuid not null references public.line_channels (id) on delete cascade,
  content text not null,
  status public.broadcast_status not null,
  -- Populated when status = 'failed' (e.g. the LINE API call itself
  -- errored) — kept for the history view, not surfaced elsewhere.
  error_message text,
  sent_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index broadcasts_organization_id_created_at_idx on public.broadcasts (organization_id, created_at desc);

alter table public.broadcasts enable row level security;

create policy "Members can view their organization's broadcast history"
  on public.broadcasts for select
  using (public.is_org_member(organization_id));

-- No insert policy for authenticated users: same pattern as
-- record_outbound_message — a row is only ever written by
-- record_broadcast() below, AFTER the LINE API call has already been
-- attempted, so history always reflects what actually happened rather
-- than what the UI merely tried to do.
create or replace function public.record_broadcast(
  p_line_channel_id uuid,
  p_content text,
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

  insert into public.broadcasts (organization_id, line_channel_id, content, status, error_message, sent_by)
  values (v_organization_id, p_line_channel_id, p_content, p_status, p_error_message, p_sent_by)
  returning * into v_broadcast;

  return v_broadcast;
end;
$$;

revoke execute on function public.record_broadcast(uuid, text, public.broadcast_status, text, uuid) from public, anon;
grant execute on function public.record_broadcast(uuid, text, public.broadcast_status, text, uuid) to authenticated;
