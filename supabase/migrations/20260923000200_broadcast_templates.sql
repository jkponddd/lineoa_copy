-- Broadcast templates (text / image+text / image+link-button) and draft
-- CRUD. A "template" is stored explicitly rather than inferred from which
-- columns are populated, so editing a draft reopens with the same template
-- selected even if, say, link_url gets cleared mid-edit.
--
-- image_link uses LINE's Buttons Template message (a `type: "template"`
-- message, not a plain image message) — LINE has no "clickable image" on a
-- plain image message, so "image you can tap that opens a link" only
-- exists as a Buttons Template with one uri action. See
-- buildBroadcastMessages in send-broadcast.ts for how this gets built.
create type public.broadcast_template as enum ('text', 'image_text', 'image_link');

alter table public.broadcasts add column template public.broadcast_template not null default 'text';
alter table public.broadcasts add column link_url text;
alter table public.broadcasts add column link_label text;

alter table public.broadcasts drop constraint broadcasts_content_or_image;
alter table public.broadcasts add constraint broadcasts_template_fields check (
  (template = 'text' and content is not null) or
  (template = 'image_text' and (content is not null or image_media_path is not null)) or
  (template = 'image_link' and image_media_path is not null and link_url is not null and link_label is not null)
);

-- record_broadcast's signature is changing again (three new params, same
-- reason as every other signature change in this project: create or
-- replace with a different parameter list creates a second overload
-- instead of replacing the first).
drop function if exists public.record_broadcast(
  uuid, text, text, public.broadcast_audience, timestamptz, public.broadcast_status, text, uuid
);

create or replace function public.record_broadcast(
  p_line_channel_id uuid,
  p_template public.broadcast_template,
  p_content text,
  p_image_media_path text,
  p_link_url text,
  p_link_label text,
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
    organization_id, line_channel_id, template, content, image_media_path, link_url, link_label,
    audience, scheduled_at, status, error_message, sent_by
  ) values (
    v_organization_id, p_line_channel_id, p_template, p_content, p_image_media_path, p_link_url, p_link_label,
    p_audience, p_scheduled_at, p_status, p_error_message, p_sent_by
  )
  returning * into v_broadcast;

  return v_broadcast;
end;
$$;

revoke execute on function public.record_broadcast(
  uuid, public.broadcast_template, text, text, text, text, public.broadcast_audience, timestamptz,
  public.broadcast_status, text, uuid
) from public, anon;
grant execute on function public.record_broadcast(
  uuid, public.broadcast_template, text, text, text, text, public.broadcast_audience, timestamptz,
  public.broadcast_status, text, uuid
) to authenticated;

-- Updates an existing broadcast row IN PLACE — used both to re-save an
-- edited draft (status stays 'draft') and to send/schedule FROM a draft
-- (status moves to 'sent'/'failed'/'scheduled'), so a draft that gets sent
-- doesn't leave a duplicate orphan row behind. Only ever allowed starting
-- from status = 'draft' — once a broadcast has actually gone out or been
-- scheduled, it's no longer an editable draft (cancel-then-recreate is the
-- path for a scheduled one, same as before).
create or replace function public.update_broadcast(
  p_broadcast_id uuid,
  p_line_channel_id uuid,
  p_template public.broadcast_template,
  p_content text,
  p_image_media_path text,
  p_link_url text,
  p_link_label text,
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
      template = p_template,
      content = p_content,
      image_media_path = p_image_media_path,
      link_url = p_link_url,
      link_label = p_link_label,
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
  uuid, uuid, public.broadcast_template, text, text, text, text, public.broadcast_audience, timestamptz,
  public.broadcast_status, text
) from public, anon;
grant execute on function public.update_broadcast(
  uuid, uuid, public.broadcast_template, text, text, text, text, public.broadcast_audience, timestamptz,
  public.broadcast_status, text
) to authenticated;

-- Hard-deletes a draft. Only ever allowed for status = 'draft' — a draft
-- was never sent, so unlike a resolved broadcast there's no history value
-- in keeping the row around.
create or replace function public.delete_broadcast_draft(p_broadcast_id uuid)
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
  where id = p_broadcast_id and status = 'draft';

  if v_organization_id is null then
    raise exception 'Draft not found or no longer deletable';
  end if;

  if not public.is_org_member(v_organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  delete from public.broadcasts where id = p_broadcast_id;
end;
$$;

revoke execute on function public.delete_broadcast_draft(uuid) from public, anon;
grant execute on function public.delete_broadcast_draft(uuid) to authenticated;
