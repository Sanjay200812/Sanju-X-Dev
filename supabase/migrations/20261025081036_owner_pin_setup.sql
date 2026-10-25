create table public.studio_owner_config (
  owner_id uuid primary key check (owner_id='3984ceee-869a-432f-a5dd-23eb615d234d'::uuid),
  pin_verifier text not null,
  created_at timestamptz not null default now()
);
alter table public.studio_owner_config enable row level security;
revoke all on public.studio_owner_config from public,anon,authenticated;
grant select,insert on public.studio_owner_config to service_role;
-- Deliberately no client policies. Initial creation is owner-authenticated,
-- insert-only on the server; the public API cannot replace an existing code.
