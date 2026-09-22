-- Storage for Inbox image messages (inbound, fetched from LINE's Content
-- API by the webhook handler; outbound, uploaded by an agent before
-- sending). Private bucket — every read goes through a signed URL, never
-- a public one, since media can contain a customer's photo.
--
-- Object path convention: "{organization_id}/{conversation_id}/{uuid}.jpg"
-- — the leading organization_id segment is what the RLS policies below
-- check against, via storage.foldername(name).

insert into storage.buckets (id, name, public)
values ('line-media', 'line-media', false);

create policy "Members can read their organization's LINE media"
  on storage.objects for select
  using (
    bucket_id = 'line-media'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Members can upload LINE media for their organization"
  on storage.objects for insert
  with check (
    bucket_id = 'line-media'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

-- No update/delete policy: media is write-once from the chat history's
-- point of view; nothing in the product needs to edit or remove it yet.
