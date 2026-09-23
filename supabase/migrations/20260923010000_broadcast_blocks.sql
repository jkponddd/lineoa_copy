-- Replaces the fixed template/content/image_media_path/link_url/link_label
-- shape with an ordered `blocks` array (jsonb) — a small web-editor-style
-- composer where each broadcast is built from reorderable text/image/
-- video/button blocks, per the user's explicit request. The exact block
-- shape and the algorithm that turns a block list into real LINE message
-- objects live in src/lib/broadcast/blocks.ts, used identically by the
-- live preview (client-side) and the actual send (server-side).
--
-- No real broadcast rows exist yet in this project's live database (this
-- feature is one day old), so the backfill below is defensive correctness
-- rather than a real data-migration need.
alter table public.broadcasts add column blocks jsonb not null default '[]'::jsonb;

update public.broadcasts
set blocks = (
  select jsonb_agg(b) from (
    select jsonb_build_object('id', gen_random_uuid()::text, 'type', 'text', 'text', content) as b
    where content is not null
    union all
    select jsonb_build_object('id', gen_random_uuid()::text, 'type', 'image', 'mediaPath', image_media_path) as b
    where image_media_path is not null
    union all
    select jsonb_build_object('id', gen_random_uuid()::text, 'type', 'button', 'label', link_label, 'url', link_url) as b
    where link_url is not null and link_label is not null
  ) blocks_for_row
)
where content is not null or image_media_path is not null or link_url is not null;

alter table public.broadcasts drop constraint broadcasts_template_fields;
alter table public.broadcasts add constraint broadcasts_blocks_not_empty check (jsonb_array_length(blocks) > 0);

alter table public.broadcasts drop column template;
alter table public.broadcasts drop column content;
alter table public.broadcasts drop column image_media_path;
alter table public.broadcasts drop column link_url;
alter table public.broadcasts drop column link_label;

-- record_broadcast/update_broadcast's signatures are changing again (the
-- four template/content/image/link params collapse into one p_blocks) —
-- same reason as every other signature change in this project: create or
-- replace with a different parameter list creates a second overload
-- instead of replacing the first. These must be dropped BEFORE the
-- broadcast_template type below — Postgres won't drop a type that a
-- function signature still references.
drop function if exists public.record_broadcast(
  uuid, public.broadcast_template, text, text, text, text, public.broadcast_audience, timestamptz,
  public.broadcast_status, text, uuid
);
drop function if exists public.update_broadcast(
  uuid, uuid, public.broadcast_template, text, text, text, text, public.broadcast_audience, timestamptz,
  public.broadcast_status, text
);

drop type public.broadcast_template;

create or replace function public.record_broadcast(
  p_line_channel_id uuid,
  p_blocks jsonb,
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
    organization_id, line_channel_id, blocks, audience, scheduled_at, status, error_message, sent_by
  ) values (
    v_organization_id, p_line_channel_id, p_blocks, p_audience, p_scheduled_at, p_status, p_error_message, p_sent_by
  )
  returning * into v_broadcast;

  return v_broadcast;
end;
$$;

revoke execute on function public.record_broadcast(
  uuid, jsonb, public.broadcast_audience, timestamptz, public.broadcast_status, text, uuid
) from public, anon;
grant execute on function public.record_broadcast(
  uuid, jsonb, public.broadcast_audience, timestamptz, public.broadcast_status, text, uuid
) to authenticated;

create or replace function public.update_broadcast(
  p_broadcast_id uuid,
  p_line_channel_id uuid,
  p_blocks jsonb,
  p_audience public.broadcast_audience,
  p_scheduled_at timestamptz,
  p_status public.broadcast_status,
  p_error_message text
)
returns public.broadcasts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_target_organization_id uuid;
  v_broadcast public.broadcasts;
begin
  select organization_id into v_organization_id
  from public.broadcasts
  where id = p_broadcast_id and status = 'draft';

  if v_organization_id is null then
    raise exception 'Draft not found or no longer editable';
  end if;

  if not public.is_org_member(v_organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  select organization_id into v_target_organization_id from public.line_channels where id = p_line_channel_id;

  if v_target_organization_id is null or v_target_organization_id <> v_organization_id then
    raise exception 'LINE channel not found';
  end if;

  update public.broadcasts
  set line_channel_id = p_line_channel_id,
      blocks = p_blocks,
      audience = p_audience,
      scheduled_at = p_scheduled_at,
      status = p_status,
      error_message = p_error_message
  where id = p_broadcast_id
  returning * into v_broadcast;

  return v_broadcast;
end;
$$;

revoke execute on function public.update_broadcast(
  uuid, uuid, jsonb, public.broadcast_audience, timestamptz, public.broadcast_status, text
) from public, anon;
grant execute on function public.update_broadcast(
  uuid, uuid, jsonb, public.broadcast_audience, timestamptz, public.broadcast_status, text
) to authenticated;
