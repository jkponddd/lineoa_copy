-- Fix: deleteRichMenuAction removes the uploaded image from
-- rich-menu-images after removing the DB row, but the bucket only had
-- SELECT and INSERT policies — no DELETE. Caught live: `.remove()` reported
-- success (no error) but the object was still there on the next list()
-- call. This is the same "RLS silently affects zero rows" behavior as any
-- other RLS-filtered DELETE — Storage's API doesn't treat "deleted 0 of 1
-- requested objects" as an error, so the bug was invisible without actually
-- re-listing the bucket afterward.
create policy "Members can delete their organization's rich menu images"
  on storage.objects for delete
  using (
    bucket_id = 'rich-menu-images'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
