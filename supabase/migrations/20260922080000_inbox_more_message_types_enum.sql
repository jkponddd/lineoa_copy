-- Own migration, isolated from anything that uses the new values —
-- Postgres won't let a newly added enum value be referenced by a statement
-- in the same transaction that added it (same reason the rich menu
-- 'custom' layout value got its own migration).
alter type public.message_type add value 'sticker';
alter type public.message_type add value 'file';
