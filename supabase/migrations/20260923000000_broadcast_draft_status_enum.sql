-- Own migration, isolated from anything that uses the new value —
-- Postgres won't let a newly added enum value be referenced by a statement
-- in the same transaction that added it.
alter type public.broadcast_status add value 'draft';
