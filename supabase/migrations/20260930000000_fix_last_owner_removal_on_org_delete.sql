-- Bug found via live verification of delete_organization() (Step 28): the
-- last-owner safeguard trigger on organization_members fires even when the
-- owner row is being removed because the ORGANIZATION ITSELF is being
-- deleted (via on delete cascade), which always leaves zero owners by
-- design. That's correct in every other case (e.g. the admin "remove
-- member" flow) but wrongly blocks every org deletion, since a
-- single-owner org is the common case.
--
-- Fix: skip the check when the parent organization row is already gone.
-- Safe to rely on here — the cascade's row delete on `organizations`
-- happens before its ON DELETE CASCADE trigger fires on `organization_members`
-- within the same command, so this SELECT correctly sees it as gone.
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

  if not exists (select 1 from public.organizations where id = v_organization_id) then
    return coalesce(new, old);
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
