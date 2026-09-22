-- Organization Settings: editable name (already covered by the existing
-- "Owners can update their organization" policy from migration 1 — no new
-- policy needed for that part) plus a logo.

alter table public.organizations add column logo_url text;

-- Public bucket, unlike line-media: a logo is meant to be shown widely
-- (header, sidebar, marketing page) and isn't sensitive, so a plain public
-- URL is the right tradeoff here — no signed-URL machinery needed.
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true);

-- Object path convention: "{organization_id}/logo.{ext}" — same
-- is_org_member-style pattern as line-media's RLS, but owner-gated for
-- writes since a logo is an organization-identity setting, not routine
-- member activity. No RLS needed for reads: the bucket is public, so
-- storage.objects SELECT is open regardless of policy.
create policy "Owners can upload their organization's logo"
  on storage.objects for insert
  with check (
    bucket_id = 'org-logos'
    and public.is_org_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "Owners can replace their organization's logo"
  on storage.objects for update
  using (
    bucket_id = 'org-logos'
    and public.is_org_owner(((storage.foldername(name))[1])::uuid)
  );
