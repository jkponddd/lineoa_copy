-- Run this AFTER creating a user via Dashboard > Authentication > Users > Add user.
-- Paste that user's UID below, then run this whole script in the SQL Editor.
--
-- Not part of supabase/migrations/ on purpose — this is a one-off dev/seed
-- helper for creating your own first owner account, not a schema change.

do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <-- paste the User UID here
  org_name text := 'My Organization';                             -- <-- change this
  new_org_id uuid;
begin
  insert into public.organizations (name, slug)
  values (
    org_name,
    lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6)
  )
  returning id into new_org_id;

  -- Done via service-role/SQL-editor context, not an authenticated request,
  -- so handle_new_organization's own auth.uid()-based auto-owner step is a
  -- no-op here (see docs/decisions/0002-auth-approach.md) — insert the
  -- owner membership explicitly instead.
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, target_user_id, 'owner');

  raise notice 'Created organization % with owner %', new_org_id, target_user_id;
end $$;
