-- Fix: line_channels had no way to route an incoming webhook to the right
-- channel. LINE's webhook request body never contains the numeric Channel
-- ID shown in the Developers Console (line_channel_id, already stored) —
-- it contains a top-level "destination" field, which is the bot's own
-- user ID (format U[0-9a-f]{32}), documented by LINE specifically for this
-- "which of my channels is this for" purpose. Caught before any webhook
-- code was written, by checking LINE's docs rather than assuming.
--
-- bot_user_id is fetched from LINE's "Get bot info" API
-- (GET https://api.line.me/v2/bot/info) using the channel access token at
-- connect-channel time — see create_line_channel's new parameter below.
-- That call also doubles as validating the access token actually works.

alter table public.line_channels add column bot_user_id text;

-- Backfilled data would need bot_user_id populated before this could be
-- NOT NULL; safe to require going forward since create_line_channel now
-- always supplies it. No existing rows in this project (this table went in
-- and was torn back down to empty during testing in the same session), so
-- this is a same-day fix, not a real migration-on-existing-data concern.
alter table public.line_channels alter column bot_user_id set not null;
alter table public.line_channels add constraint line_channels_bot_user_id_key unique (bot_user_id);

create or replace function public.create_line_channel(
  p_organization_id uuid,
  p_line_channel_id text,
  p_bot_user_id text,
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
    organization_id, line_channel_id, bot_user_id, display_name, channel_secret_id, channel_access_token_id
  ) values (
    p_organization_id, p_line_channel_id, p_bot_user_id, p_display_name, v_secret_id, v_token_id
  )
  returning * into v_channel;

  return v_channel;
end;
$$;

-- Old 5-arg signature is gone now that p_bot_user_id was added; drop it so
-- there isn't a dangling overload nothing calls.
drop function if exists public.create_line_channel(uuid, text, text, text, text);

revoke execute on function public.create_line_channel(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.create_line_channel(uuid, text, text, text, text, text) to authenticated;

-- Looks up a channel by the webhook's "destination" field — the one piece
-- of routing info LINE actually sends. Kept separate from
-- get_line_channel_secrets (still service_role-only, still decrypts)
-- rather than folding bot_user_id lookup into it, so the metadata lookup
-- and the secret decryption stay two distinct, separately-auditable steps.
create or replace function public.get_line_channel_secrets_by_bot_user_id(p_bot_user_id text)
returns table (line_channel_id text, channel_secret text, channel_access_token text)
language sql
security definer
set search_path = public
stable
as $$
  select c.line_channel_id, s.decrypted_secret, t.decrypted_secret
  from public.line_channels c
  join vault.decrypted_secrets s on s.id = c.channel_secret_id
  join vault.decrypted_secrets t on t.id = c.channel_access_token_id
  where c.bot_user_id = p_bot_user_id;
$$;

revoke execute on function public.get_line_channel_secrets_by_bot_user_id(text) from public, anon, authenticated;
grant execute on function public.get_line_channel_secrets_by_bot_user_id(text) to service_role;
