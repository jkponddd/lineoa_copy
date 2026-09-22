-- Rich Menu builder: grid-template layouts only (confirmed scope — no
-- freeform drag-and-drop), background image uploaded by the user. `areas`
-- stores per-area label + action (message text or a URI) as jsonb; the
-- actual pixel bounds for each area are computed deterministically from
-- `layout` at call time (src/lib/line/rich-menu-layouts.ts), not stored —
-- one source of truth instead of two that could drift apart.

create type public.rich_menu_layout as enum ('1x1', '2x1', '3x1', '2x2', '3x2');
create type public.rich_menu_status as enum ('published', 'failed');

create table public.rich_menus (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  line_channel_id uuid not null references public.line_channels (id) on delete cascade,
  name text not null,
  layout public.rich_menu_layout not null,
  image_path text not null,
  -- One element per area, in the same order computeAreas() returns bounds
  -- for that layout: [{ "label": text, "action_type": "message"|"uri", "action_value": text }, ...]
  areas jsonb not null,
  -- LINE's own richMenuId once created there — null if creation failed
  -- before LINE ever returned one.
  line_rich_menu_id text,
  is_default boolean not null default false,
  status public.rich_menu_status not null,
  error_message text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rich_menus_set_updated_at
  before update on public.rich_menus
  for each row execute function public.set_updated_at();

create index rich_menus_organization_id_idx on public.rich_menus (organization_id);

alter table public.rich_menus enable row level security;

create policy "Members can view their organization's rich menus"
  on public.rich_menus for select
  using (public.is_org_member(organization_id));

-- No insert/update/delete policy for authenticated: every write goes
-- through the three functions below, all of which call LINE's API (or, for
-- the delete case, expect the caller to have already) before touching this
-- table — same "record what actually happened" pattern as broadcasts.

create or replace function public.record_rich_menu(
  p_line_channel_id uuid,
  p_name text,
  p_layout public.rich_menu_layout,
  p_image_path text,
  p_areas jsonb,
  p_line_rich_menu_id text,
  p_status public.rich_menu_status,
  p_error_message text,
  p_created_by uuid
)
returns public.rich_menus
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_rich_menu public.rich_menus;
begin
  select organization_id into v_organization_id from public.line_channels where id = p_line_channel_id;

  if v_organization_id is null then
    raise exception 'LINE channel not found';
  end if;

  if not public.is_org_member(v_organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  insert into public.rich_menus (
    organization_id, line_channel_id, name, layout, image_path, areas,
    line_rich_menu_id, status, error_message, created_by
  ) values (
    v_organization_id, p_line_channel_id, p_name, p_layout, p_image_path, p_areas,
    p_line_rich_menu_id, p_status, p_error_message, p_created_by
  )
  returning * into v_rich_menu;

  return v_rich_menu;
end;
$$;

revoke execute on function public.record_rich_menu(
  uuid, text, public.rich_menu_layout, text, jsonb, text, public.rich_menu_status, text, uuid
) from public, anon;
grant execute on function public.record_rich_menu(
  uuid, text, public.rich_menu_layout, text, jsonb, text, public.rich_menu_status, text, uuid
) to authenticated;

-- Called AFTER the caller has already told LINE to set this menu as the
-- default for all users. Unsets is_default on every other rich menu for the
-- same channel first, so at most one row per channel is ever marked default
-- in our own bookkeeping (LINE itself has no concept of "per-channel", only
-- one global default per channel's access token, which is exactly the same
-- scope).
create or replace function public.set_default_rich_menu(p_rich_menu_id uuid)
returns public.rich_menus
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rich_menu public.rich_menus;
begin
  select * into v_rich_menu from public.rich_menus where id = p_rich_menu_id;

  if v_rich_menu is null then
    raise exception 'Rich menu not found';
  end if;

  if not public.is_org_member(v_rich_menu.organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  update public.rich_menus
  set is_default = false
  where line_channel_id = v_rich_menu.line_channel_id and id != p_rich_menu_id;

  update public.rich_menus
  set is_default = true
  where id = p_rich_menu_id
  returning * into v_rich_menu;

  return v_rich_menu;
end;
$$;

revoke execute on function public.set_default_rich_menu(uuid) from public, anon;
grant execute on function public.set_default_rich_menu(uuid) to authenticated;

-- Called AFTER the caller has already deleted the rich menu on LINE's side
-- (or when cleaning up a row whose LINE-side creation never fully
-- succeeded).
create or replace function public.delete_rich_menu_record(p_rich_menu_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  select organization_id into v_organization_id from public.rich_menus where id = p_rich_menu_id;

  if v_organization_id is null then
    return;
  end if;

  if not public.is_org_member(v_organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  delete from public.rich_menus where id = p_rich_menu_id;
end;
$$;

revoke execute on function public.delete_rich_menu_record(uuid) from public, anon;
grant execute on function public.delete_rich_menu_record(uuid) to authenticated;

-- Storage for the uploaded background images. Private (LINE's content-
-- upload API receives the bytes directly from our server, never a URL, so
-- there's no need for these to be publicly fetchable the way org logos are).
insert into storage.buckets (id, name, public)
values ('rich-menu-images', 'rich-menu-images', false);

create policy "Members can read their organization's rich menu images"
  on storage.objects for select
  using (
    bucket_id = 'rich-menu-images'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Members can upload rich menu images for their organization"
  on storage.objects for insert
  with check (
    bucket_id = 'rich-menu-images'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
