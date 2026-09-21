-- Support for the Admin Panel's "manage users" screen: adding an existing
-- account to an organization by email, and a safeguard against removing an
-- organization's last owner.

-- auth.users isn't exposed via PostgREST (only public/graphql_public are,
-- per supabase/config.toml), and public.profiles doesn't store email — so
-- there's no way for the client to resolve "email -> user id" on its own.
-- This is the one missing piece; the actual insert into
-- organization_members still goes through the client's normal authenticated
-- session and the existing "Owners can add members" RLS policy, not a new
-- all-in-one RPC, since that policy already does the right thing once the
-- user_id is known.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where email = p_email limit 1;
$$;

revoke execute on function public.get_user_id_by_email(text) from public, anon;
grant execute on function public.get_user_id_by_email(text) to authenticated;

-- An organization with zero owners is an invalid state (nobody could ever
-- manage it again through the app — RLS for every owner-gated action
-- requires is_org_owner()). Enforced at the trigger level rather than only
-- in the UI, so it holds regardless of which code path touches this table.
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := old.organization_id;
  v_remaining_owners int;
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' then
    return new;
  end if;

  select count(*) into v_remaining_owners
  from public.organization_members
  where organization_id = v_organization_id and role = 'owner' and id <> old.id;

  if v_remaining_owners = 0 then
    raise exception 'Cannot remove the last owner of an organization';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger organization_members_prevent_last_owner_removal
  before update or delete on public.organization_members
  for each row execute function public.prevent_last_owner_removal();
