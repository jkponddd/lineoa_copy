-- Inbox: conversations (one per LINE end-user per channel) and messages
-- (inbound from LINE, outbound from an agent). Scoped by organization_id
-- like every other tenant table, per CLAUDE.md's multi-tenancy notes.

create type public.message_direction as enum ('inbound', 'outbound');
create type public.message_type as enum ('text', 'image');
create type public.conversation_status as enum ('open', 'closed');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  line_channel_id uuid not null references public.line_channels (id) on delete cascade,
  -- The LINE end-user's own userId (source.userId from the webhook),
  -- scoped to a channel, NOT LINE's numeric Channel ID.
  line_user_id text not null,
  display_name text,
  picture_url text,
  status public.conversation_status not null default 'open',
  assigned_to uuid references auth.users (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (line_channel_id, line_user_id)
);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create index conversations_organization_id_last_message_at_idx
  on public.conversations (organization_id, last_message_at desc);
create index conversations_assigned_to_idx on public.conversations (assigned_to);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  direction public.message_direction not null,
  type public.message_type not null default 'text',
  -- Text body for type='text'; for type='image' this is null and
  -- media_path carries the content instead.
  content text,
  media_path text,
  -- LINE's own message id (inbound) — kept for idempotency (a retried
  -- webhook delivery must not create a duplicate row) and for future
  -- read/delivery-receipt correlation. Null for outbound messages we send.
  line_message_id text,
  -- Who sent an outbound message; null for inbound (from the LINE user)
  -- and null for anything sent by automation rather than a human agent.
  sent_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint messages_content_or_media check (
    (type = 'text' and content is not null) or (type = 'image' and media_path is not null)
  )
);

create unique index messages_line_message_id_key
  on public.messages (line_message_id) where line_message_id is not null;
create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);
create index messages_organization_id_idx on public.messages (organization_id);

-- Keep conversations.last_message_at in sync so the inbox list can sort by
-- it directly instead of a correlated subquery per row.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- Row Level Security ---------------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Members can view their organization's conversations"
  on public.conversations for select
  using (public.is_org_member(organization_id));

create policy "Members can update their organization's conversations"
  on public.conversations for update
  using (public.is_org_member(organization_id));

-- No insert policy for authenticated users: conversation rows are only
-- ever created by the webhook handler via the service role (a conversation
-- starts when a LINE user messages in, not when an agent acts).

create policy "Members can view their organization's messages"
  on public.messages for select
  using (public.is_org_member(organization_id));

-- No insert policy for authenticated users here either: outbound messages
-- are written by a server action after successfully pushing through the
-- LINE API, via send_outbound_message() below (SECURITY DEFINER), so a row
-- never exists claiming to be sent when the LINE API call actually failed.

-- Assigns (or unassigns, with p_assigned_to = null) a conversation to an
-- org member. SECURITY DEFINER only to double-check the assignee is
-- actually a member of the same organization — a plain RLS update policy
-- can't express a check against a *different* row's organization_id.
create or replace function public.assign_conversation(p_conversation_id uuid, p_assigned_to uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
begin
  select * into v_conversation from public.conversations where id = p_conversation_id;

  if v_conversation is null then
    raise exception 'Conversation not found';
  end if;

  if not public.is_org_member(v_conversation.organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  if p_assigned_to is not null and not exists (
    select 1 from public.organization_members
    where organization_id = v_conversation.organization_id and user_id = p_assigned_to
  ) then
    raise exception 'Assignee is not a member of this organization';
  end if;

  update public.conversations
  set assigned_to = p_assigned_to
  where id = p_conversation_id
  returning * into v_conversation;

  return v_conversation;
end;
$$;

revoke execute on function public.assign_conversation(uuid, uuid) from public, anon;
grant execute on function public.assign_conversation(uuid, uuid) to authenticated;

-- Records an outbound message that has ALREADY been pushed through the
-- LINE API successfully (the caller is a server action holding the
-- service-role client, since sending requires the decrypted channel
-- access token — see get_line_channel_secrets). SECURITY DEFINER so it can
-- still verify the calling user is a member of the conversation's
-- organization before writing the row, even though it runs with elevated
-- privileges.
create or replace function public.record_outbound_message(
  p_conversation_id uuid,
  p_type public.message_type,
  p_content text,
  p_media_path text,
  p_sent_by uuid
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
  v_message public.messages;
begin
  select * into v_conversation from public.conversations where id = p_conversation_id;

  if v_conversation is null then
    raise exception 'Conversation not found';
  end if;

  if not public.is_org_member(v_conversation.organization_id) then
    raise exception 'Not a member of this organization';
  end if;

  insert into public.messages (organization_id, conversation_id, direction, type, content, media_path, sent_by)
  values (v_conversation.organization_id, p_conversation_id, 'outbound', p_type, p_content, p_media_path, p_sent_by)
  returning * into v_message;

  return v_message;
end;
$$;

revoke execute on function public.record_outbound_message(uuid, public.message_type, text, text, uuid) from public, anon;
grant execute on function public.record_outbound_message(uuid, public.message_type, text, text, uuid) to authenticated;

-- Called by the webhook handler (service role), split into two steps
-- rather than one because an image message needs the conversation's
-- organization_id/conversation_id to build its Storage path *before* the
-- message row (which references that path) can be inserted.

-- Step 1: find-or-create the conversation. Takes the bot's own userId (the
-- webhook body's "destination" field, already used by
-- get_line_channel_secrets_by_bot_user_id to route the request) rather
-- than line_channels.id, so the webhook handler never needs a second
-- lookup just to learn that uuid.
create or replace function public.upsert_conversation_for_webhook(
  p_bot_user_id text,
  p_line_user_id text,
  p_display_name text,
  p_picture_url text
)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations;
begin
  insert into public.conversations (organization_id, line_channel_id, line_user_id, display_name, picture_url)
  select c.organization_id, c.id, p_line_user_id, p_display_name, p_picture_url
  from public.line_channels c
  where c.bot_user_id = p_bot_user_id
  on conflict (line_channel_id, line_user_id) do update
  set display_name = coalesce(excluded.display_name, public.conversations.display_name),
      picture_url = coalesce(excluded.picture_url, public.conversations.picture_url)
  returning * into v_conversation;

  if v_conversation is null then
    raise exception 'Unknown LINE channel for bot_user_id %', p_bot_user_id;
  end if;

  return v_conversation;
end;
$$;

revoke execute on function public.upsert_conversation_for_webhook(text, text, text, text) from public, anon, authenticated;
grant execute on function public.upsert_conversation_for_webhook(text, text, text, text) to service_role;

-- Step 2: insert the inbound message once any media has already been
-- uploaded (image messages) or immediately (text messages). on conflict on
-- line_message_id makes retried webhook deliveries a no-op instead of a
-- duplicate row.
create or replace function public.insert_inbound_message(
  p_conversation_id uuid,
  p_type public.message_type,
  p_content text,
  p_media_path text,
  p_line_message_id text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_message public.messages;
begin
  select organization_id into v_organization_id from public.conversations where id = p_conversation_id;

  if v_organization_id is null then
    raise exception 'Conversation not found';
  end if;

  insert into public.messages (organization_id, conversation_id, direction, type, content, media_path, line_message_id)
  values (v_organization_id, p_conversation_id, 'inbound', p_type, p_content, p_media_path, p_line_message_id)
  on conflict (line_message_id) where line_message_id is not null do nothing
  returning * into v_message;

  return v_message;
end;
$$;

revoke execute on function public.insert_inbound_message(uuid, public.message_type, text, text, text)
  from public, anon, authenticated;
grant execute on function public.insert_inbound_message(uuid, public.message_type, text, text, text)
  to service_role;

-- Realtime: the Inbox list/thread subscribe to postgres_changes on these
-- two tables client-side (via the authenticated user's own session, so
-- their existing RLS select policies above gate what they actually
-- receive).
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
