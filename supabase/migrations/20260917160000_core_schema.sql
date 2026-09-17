-- Core multi-tenancy schema: organizations, profiles, membership/roles, audit log.
-- See docs/decisions/0001-multi-tenancy-and-rls.md for the reasoning behind this design.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- organizations ---------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- profiles (1:1 with auth.users) -----------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- organization_members (role-based membership) ---------------------------

create type public.org_role as enum ('owner', 'agent', 'analyst');

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

create index organization_members_organization_id_idx on public.organization_members (organization_id);
create index organization_members_user_id_idx on public.organization_members (user_id);

-- Auto-add the creator of an organization as its owner. SECURITY DEFINER so
-- this bypasses RLS: at the moment an org is created, no membership row
-- exists yet, so an RLS-checked insert would have nothing to authorize
-- against ("owner manages membership" needs a membership that can't exist
-- yet). This is the one deliberate bootstrap exception.
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- RLS helper functions ----------------------------------------------------
-- SECURITY DEFINER so these bypass RLS internally: a policy on
-- organization_members that queried organization_members directly (even via
-- a subquery) would recurse into itself. Routing the lookup through a
-- SECURITY DEFINER function is the standard Supabase pattern to avoid that.

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- audit_log ----------------------------------------------------------------

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_organization_id_created_at_idx on public.audit_log (organization_id, created_at desc);

-- Row Level Security --------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_log enable row level security;

-- organizations

create policy "Members can view their organizations"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Owners can update their organization"
  on public.organizations for update
  using (public.is_org_owner(id));

create policy "Authenticated users can create an organization"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- profiles

create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Org members can view teammates' profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid() and theirs.user_id = public.profiles.id
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- organization_members

create policy "Members can view their organization's membership list"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "Owners can add members"
  on public.organization_members for insert
  with check (public.is_org_owner(organization_id));

create policy "Owners can update member roles"
  on public.organization_members for update
  using (public.is_org_owner(organization_id));

create policy "Owners can remove members"
  on public.organization_members for delete
  using (public.is_org_owner(organization_id));

-- audit_log (append-only from the client: no update/delete policy)

create policy "Org members can view their organization's audit log"
  on public.audit_log for select
  using (public.is_org_member(organization_id));

create policy "Org members can write audit entries"
  on public.audit_log for insert
  with check (public.is_org_member(organization_id));
