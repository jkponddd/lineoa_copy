-- LINE OA channel credentials, per organization. Channel secret and access
-- token are stored via Supabase Vault (encrypted at rest via pgsodium),
-- never in a plaintext column — required by CLAUDE.md's multi-tenancy
-- notes. See docs/decisions/0003-line-credential-storage.md.

create table public.line_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- LINE's own numeric Channel ID (from the Developers Console). Used to
  -- route an incoming webhook to the right organization/channel.
  line_channel_id text not null unique,
  display_name text not null,
  channel_secret_id uuid not null references vault.secrets (id) on delete restrict,
  channel_access_token_id uuid not null references vault.secrets (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger line_channels_set_updated_at
  before update on public.line_channels
  for each row execute function public.set_updated_at();

create index line_channels_organization_id_idx on public.line_channels (organization_id);

alter table public.line_channels enable row level security;

create policy "Members can view their organization's LINE channels"
  on public.line_channels for select
  using (public.is_org_member(organization_id));

-- No insert/update/delete policies on line_channels directly — those only
-- happen through create_line_channel() / delete_line_channel() below,
-- which re-check ownership themselves and are the only way to touch the
-- Vault secret rows correctly (a direct table insert/update could never
-- populate channel_secret_id / channel_access_token_id without already
-- having called vault.create_secret first).

-- Called by an org owner (via their normal authenticated session) to
-- connect a LINE channel. SECURITY DEFINER because inserting into
-- vault.secrets requires elevated privileges an ordinary authenticated
-- role doesn't have — the is_org_owner() check below is what stands in
-- for RLS here, same reasoning as is_org_member()/is_org_owner() themselves.
create or replace function public.create_line_channel(
  p_organization_id uuid,
  p_line_channel_id text,
  p_display_name text,
  p_channel_secret text,
  p_channel_access_token text
)
returns public.line_channels
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret_id uuid;
  v_token_id uuid;
  v_channel public.line_channels;
begin
  if not public.is_org_owner(p_organization_id) then
    raise exception 'Only an organization owner can connect a LINE channel';
  end if;

  v_secret_id := vault.create_secret(p_channel_secret, p_line_channel_id || ':secret');
  v_token_id := vault.create_secret(p_channel_access_token, p_line_channel_id || ':token');

  insert into public.line_channels (
    organization_id, line_channel_id, display_name, channel_secret_id, channel_access_token_id
  ) values (
    p_organization_id, p_line_channel_id, p_display_name, v_secret_id, v_token_id
  )
  returning * into v_channel;

  return v_channel;
end;
$$;

revoke execute on function public.create_line_channel(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_line_channel(uuid, text, text, text, text) to authenticated;

-- Decrypts a channel's credentials. Deliberately NOT reachable by
-- `authenticated` or `anon` — only `service_role` can call this, so the
-- only place decrypted secrets can ever appear is trusted server-side code
-- using the service role key (the webhook handler, the push-message
-- sender), never a logged-in user's own session, not even an owner's.
create or replace function public.get_line_channel_secrets(p_line_channel_id text)
returns table (channel_secret text, channel_access_token text)
language sql
security definer
set search_path = public
stable
as $$
  select s.decrypted_secret, t.decrypted_secret
  from public.line_channels c
  join vault.decrypted_secrets s on s.id = c.channel_secret_id
  join vault.decrypted_secrets t on t.id = c.channel_access_token_id
  where c.line_channel_id = p_line_channel_id;
$$;

revoke execute on function public.get_line_channel_secrets(text) from public, anon, authenticated;
grant execute on function public.get_line_channel_secrets(text) to service_role;

-- Owner-only removal, mirroring create_line_channel's authorization check.
-- Deletes the Vault secrets too (on delete restrict above means a plain
-- `delete from line_channels` would fail without this).
create or replace function public.delete_line_channel(p_line_channel_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel public.line_channels;
begin
  select * into v_channel from public.line_channels where line_channel_id = p_line_channel_id;

  if v_channel is null then
    return;
  end if;

  if not public.is_org_owner(v_channel.organization_id) then
    raise exception 'Only an organization owner can remove a LINE channel';
  end if;

  delete from public.line_channels where id = v_channel.id;
  delete from vault.secrets where id in (v_channel.channel_secret_id, v_channel.channel_access_token_id);
end;
$$;

revoke execute on function public.delete_line_channel(text) from public, anon;
grant execute on function public.delete_line_channel(text) to authenticated;
