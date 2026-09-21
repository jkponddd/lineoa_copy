-- The members list needs each member's email to be useful (a list of bare
-- UUIDs isn't), but the same gap as get_user_id_by_email applies: email
-- lives only in auth.users, which isn't PostgREST-exposed, and profiles
-- doesn't duplicate it. Rather than denormalizing email into profiles
-- (which would need its own sync trigger for email-change events), this
-- joins auth.users directly in a SECURITY DEFINER function — auth.users
-- stays the single source of truth for email.
create or replace function public.get_organization_members(p_organization_id uuid)
returns table (
  id uuid,
  user_id uuid,
  role public.org_role,
  email text,
  full_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.user_id, m.role, u.email, p.full_name, m.created_at
  from public.organization_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where public.is_org_member(p_organization_id) and m.organization_id = p_organization_id
  order by m.created_at asc;
$$;

revoke execute on function public.get_organization_members(uuid) from public, anon;
grant execute on function public.get_organization_members(uuid) to authenticated;
