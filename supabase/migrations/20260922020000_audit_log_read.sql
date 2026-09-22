-- The audit_log table (from migration 1) already lets any org member insert
-- and select their own organization's rows via RLS — but a bare row only
-- has actor_id (a uuid), and email lives in auth.users, which isn't
-- PostgREST-exposed. Same gap, same fix as get_organization_members: a
-- SECURITY DEFINER function that joins auth.users, gated the identical way.
create or replace function public.get_audit_log(p_organization_id uuid, p_limit int default 200)
returns table (
  id uuid,
  action text,
  target text,
  metadata jsonb,
  actor_id uuid,
  actor_email text,
  actor_full_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id, a.action, a.target, a.metadata,
    a.actor_id, u.email, p.full_name,
    a.created_at
  from public.audit_log a
  left join auth.users u on u.id = a.actor_id
  left join public.profiles p on p.id = a.actor_id
  where public.is_org_member(p_organization_id) and a.organization_id = p_organization_id
  order by a.created_at desc
  limit p_limit;
$$;

revoke execute on function public.get_audit_log(uuid, int) from public, anon;
grant execute on function public.get_audit_log(uuid, int) to authenticated;
