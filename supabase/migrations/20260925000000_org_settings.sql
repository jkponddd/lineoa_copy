-- System Settings: org-level defaults (locale for newly invited members,
-- timezone for interpreting Broadcast schedule times) plus a real "delete
-- organization" path — the Admin Panel's Organization page already covers
-- name/logo, so this is what's left under "ตั้งค่าระบบ" specifically.
alter table public.organizations add column default_locale text not null default 'th';
alter table public.organizations add column default_timezone text not null default 'Asia/Bangkok';
alter table public.organizations add constraint organizations_default_locale_check check (default_locale in ('th', 'en'));

-- No new RLS policy needed for updating these two columns — the existing
-- "Owners can update their organization" policy already covers arbitrary
-- column updates by an owner.

-- Deletes an organization and everything under it. Every tenant table
-- already references organizations with `on delete cascade`, so the table
-- rows themselves are handled by Postgres automatically — the one thing
-- cascade can't reach is Vault: line_channels' encrypted secrets live in
-- vault.secrets, referenced BY channel_secret_id/channel_access_token_id
-- (the foreign key points the other way), so they'd be orphaned if not
-- cleaned up explicitly first. Same reasoning as delete_line_channel()'s
-- own Vault cleanup, just for every channel the org has at once.
create or replace function public.delete_organization(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_owner(p_organization_id) then
    raise exception 'Only an organization owner can delete the organization';
  end if;

  delete from vault.secrets
  where id in (
    select channel_secret_id from public.line_channels where organization_id = p_organization_id
    union
    select channel_access_token_id from public.line_channels where organization_id = p_organization_id
  );

  delete from public.organizations where id = p_organization_id;
end;
$$;

revoke execute on function public.delete_organization(uuid) from public, anon;
grant execute on function public.delete_organization(uuid) to authenticated;
