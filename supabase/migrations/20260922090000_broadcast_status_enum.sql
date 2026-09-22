-- Own migration, isolated from anything that uses the new values —
-- Postgres won't let a newly added enum value be referenced by a statement
-- in the same transaction that added it.
alter type public.broadcast_status add value 'scheduled';
alter type public.broadcast_status add value 'sending';
