-- Two additions, requested after the Rich Menu builder shipped:
-- 1. A "custom" layout (the 'custom' enum value went in as its own prior
--    migration) — areas are hand-drawn with their own bounds instead of
--    coming from a fixed template. `computeAreaBounds()` no longer covers
--    this case; bounds travel inside each area's own jsonb entry instead
--    (as 0-100 percentages of the canvas, resolution-independent, resolved
--    to actual 2500x1686 pixels only when building the LINE API payload).
-- 2. A third area action type, "richmenuswitch" — LINE's own mechanism for
--    one rich menu's button to switch the user to a different rich menu
--    (the "tabs" behavior). LINE requires a stable *alias* id per rich
--    menu to reference it this way (https://developers.line.biz/en/reference/messaging-api/#rich-menu-alias),
--    so every successfully published rich menu now gets one, created
--    right after its image upload succeeds.

alter table public.rich_menus add column line_rich_menu_alias_id text;

-- record_rich_menu's signature is changing (two new params), so the old
-- overload has to be dropped explicitly — create or replace with a
-- different parameter list creates a second overload instead of replacing
-- the first, leaving a dangling copy of the old one.
drop function if exists public.record_rich_menu(
  uuid, text, public.rich_menu_layout, text, jsonb, text, public.rich_menu_status, text, uuid
);

-- p_id is accepted (rather than always generated inside this function) so
-- the caller can create the LINE-side alias — which needs to reference
-- *something* stable as its id — using this row's own future primary key,
-- before the row itself exists yet. Falls back to gen_random_uuid() if the
-- caller doesn't supply one (keeps this function usable the old way too).
create or replace function public.record_rich_menu(
  p_id uuid,
  p_line_channel_id uuid,
  p_name text,
  p_layout public.rich_menu_layout,
  p_image_path text,
  p_areas jsonb,
  p_line_rich_menu_id text,
  p_line_rich_menu_alias_id text,
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
    id, organization_id, line_channel_id, name, layout, image_path, areas,
    line_rich_menu_id, line_rich_menu_alias_id, status, error_message, created_by
  ) values (
    coalesce(p_id, gen_random_uuid()), v_organization_id, p_line_channel_id, p_name, p_layout, p_image_path, p_areas,
    p_line_rich_menu_id, p_line_rich_menu_alias_id, p_status, p_error_message, p_created_by
  )
  returning * into v_rich_menu;

  return v_rich_menu;
end;
$$;

revoke execute on function public.record_rich_menu(
  uuid, uuid, text, public.rich_menu_layout, text, jsonb, text, text, public.rich_menu_status, text, uuid
) from public, anon;
grant execute on function public.record_rich_menu(
  uuid, uuid, text, public.rich_menu_layout, text, jsonb, text, text, public.rich_menu_status, text, uuid
) to authenticated;
