-- Custom, org-configurable contact tags. Requested for the Broadcast
-- test-send contact picker (show a badge on each contact's name), but
-- modeled as its own general-purpose feature — a tag is assigned to a
-- `conversations` row, not baked into Broadcast at all, so it's equally
-- usable from the Inbox thread view.
--
-- Two tables, no PL/pgSQL functions needed: unlike record_broadcast/
-- assign_conversation (which must reach across to a *different* row's
-- organization_id, something plain RLS quals can't express), every check
-- here is expressible directly against the row being written, so ordinary
-- RLS policies are enough.
--
-- Permission split: defining/editing/deleting which tags exist is
-- owner-only (same tier as Roles/Billing/Settings in the Admin Panel).
-- Assigning an existing tag to a conversation is any org member — that's
-- an operational action taken while chatting, same tier as replying or
-- assigning a conversation.
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  color text not null default '#6b7280',
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index tags_organization_id_idx on public.tags (organization_id);

create table public.conversation_tags (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, tag_id)
);

create index conversation_tags_tag_id_idx on public.conversation_tags (tag_id);

alter table public.tags enable row level security;
alter table public.conversation_tags enable row level security;

create policy "Members can view their organization's tags"
  on public.tags for select
  using (public.is_org_member(organization_id));

create policy "Owners can manage their organization's tags"
  on public.tags for all
  using (public.is_org_owner(organization_id))
  with check (public.is_org_owner(organization_id));

-- conversation_tags has no organization_id of its own — every policy joins
-- through the conversation it points at, same pattern as messages.sent_by
-- checks joining through conversations elsewhere in this project.
create policy "Members can view their organization's conversation tags"
  on public.conversation_tags for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.is_org_member(c.organization_id)
    )
  );

create policy "Members can assign tags to their organization's conversations"
  on public.conversation_tags for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.is_org_member(c.organization_id)
    )
    and exists (
      select 1 from public.tags tg
      join public.conversations c on c.id = conversation_id
      where tg.id = tag_id and tg.organization_id = c.organization_id
    )
  );

create policy "Members can unassign tags from their organization's conversations"
  on public.conversation_tags for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.is_org_member(c.organization_id)
    )
  );

alter publication supabase_realtime add table public.conversation_tags;
