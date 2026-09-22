-- Adding a new enum value must be its own migration, isolated from
-- anything that uses it — Postgres won't let a newly added enum value be
-- referenced by a statement in the same transaction that added it.
alter type public.rich_menu_layout add value 'custom';
