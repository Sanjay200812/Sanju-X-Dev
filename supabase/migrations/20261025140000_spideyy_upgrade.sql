-- Spideyy Upgrade: Atomic Lockout tracking and enquiry enhancements
create table if not exists public.studio_lockouts (
  scope text primary key,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.studio_lockouts enable row level security;
revoke all on public.studio_lockouts from anon, authenticated, public;
grant all on public.studio_lockouts to service_role;

-- Add read and email_status columns to studio_enquiries if not already present
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'read'
  ) then
    alter table public.studio_enquiries add column read boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'email_status'
  ) then
    alter table public.studio_enquiries add column email_status text not null default 'pending';
  end if;
end $$;

-- Enable Realtime publication for studio_enquiries if the publication exists
do $$
begin
  begin
    alter publication supabase_realtime add table public.studio_enquiries;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
