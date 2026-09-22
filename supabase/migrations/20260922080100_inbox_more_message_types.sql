-- Inbox now recognizes two more inbound LINE message types: sticker and
-- file (video/audio/location remain silently skipped, unchanged).
--
-- sticker: no bytes to fetch — LINE stickers are served from a public,
-- predictable CDN URL built from packageId/stickerId, so `content` just
-- stores those two ids as JSON ({"packageId":"...","stickerId":"..."}) and
-- the UI builds the CDN URL directly. `media_path` stays null, same as text.
-- file: same download-then-store shape as image (uses the Content API,
-- media_path required), but `content` holds the original filename instead
-- of being null, so the UI can show something better than a bare link.

alter table public.messages drop constraint messages_content_or_media;

alter table public.messages add constraint messages_content_or_media check (
  (type = 'text' and content is not null) or
  (type = 'image' and media_path is not null) or
  (type = 'sticker' and content is not null) or
  (type = 'file' and media_path is not null)
);
