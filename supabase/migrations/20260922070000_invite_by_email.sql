-- Invite-by-email for people without an existing account (explicitly
-- scoped out of Step 6, revisited now). Uses Supabase's own
-- admin.inviteUserByEmail() rather than a bespoke invites table + token —
-- it already does exactly what's needed (creates an unconfirmed auth user,
-- sends an email, and the accept link runs through the same
-- verifyOtp()-based /auth/confirm route already built for password reset).
--
-- The one gap: inviteUserByEmail has no notion of "which organization, what
-- role" — so that's carried through as user_metadata (`invited_org_id`,
-- `invited_role`) set when the invite is sent, and handle_new_user() (which
-- already runs for every new auth user to create their profile row) now
-- also completes the organization_members insert if that metadata is
-- present. Wrapped in its own exception handler so a malformed/stale
-- invite (bad org id, org deleted since, invalid role) never blocks the
-- user account itself from being created — worst case, they sign in with
-- no organization and see the ordinary onboarding flow.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_invited_org_id uuid;
  v_invited_role public.org_role;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  begin
    v_invited_org_id := (new.raw_user_meta_data ->> 'invited_org_id')::uuid;
    v_invited_role := (new.raw_user_meta_data ->> 'invited_role')::public.org_role;

    if v_invited_org_id is not null and v_invited_role is not null then
      insert into public.organization_members (organization_id, user_id, role)
      values (v_invited_org_id, new.id, v_invited_role)
      on conflict (organization_id, user_id) do nothing;
    end if;
  exception when others then
    null;
  end;

  return new;
end;
$$;
