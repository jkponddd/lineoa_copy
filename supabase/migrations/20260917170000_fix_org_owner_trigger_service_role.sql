-- Fix: handle_new_organization crashed when an org was inserted by a caller
-- with no authenticated session (e.g. the service role key) — auth.uid() is
-- null in that context, and organization_members.user_id is NOT NULL, so
-- the trigger's insert failed and rolled back the organizations insert too.
-- Found by testing: inserting an org with the service role key, exactly as
-- any backend/admin script or seed script would, failed outright.
--
-- Service-role-driven inserts (seed scripts, admin backend jobs, a future
-- "staff creates an org on behalf of a client" flow) now skip the
-- auto-owner step and must insert the owner membership themselves — there's
-- no reliable way for the trigger to infer who the intended owner is when
-- there's no authenticated session to read auth.uid() from.

create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (new.id, auth.uid(), 'owner');
  end if;
  return new;
end;
$$;
