-- Fix: replacing an existing logo (upload with upsert, which becomes an
-- UPDATE on the existing storage.objects row) was rejected by RLS even for
-- the actual owner — "new row violates row-level security policy". Caught
-- live: a first upload to a new path succeeded, but re-uploading to the
-- same path (the real-world "change your logo" case) failed every time,
-- while the equivalent plain INSERT never did.
--
-- Root cause: the original UPDATE policy only had a USING clause. Per
-- Postgres docs, an UPDATE policy with no WITH CHECK is supposed to reuse
-- USING for the new-row check too — but that combination was still being
-- rejected here, so make it explicit rather than relying on the implicit
-- fallback.
drop policy "Owners can replace their organization's logo" on storage.objects;

create policy "Owners can replace their organization's logo"
  on storage.objects for update
  using (
    bucket_id = 'org-logos'
    and public.is_org_owner(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'org-logos'
    and public.is_org_owner(((storage.foldername(name))[1])::uuid)
  );
