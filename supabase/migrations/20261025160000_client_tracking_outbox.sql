-- Migration: Client Enquiry Tracking, Active Projects, Email Outbox and Customer Verification

-- 1. Sequence and Function for Unique Sequential Tracking Code (SXD-001, SXD-002, ...)
create sequence if not exists public.studio_enquiry_seq start with 1;

create or replace function public.studio_generate_tracking_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  seq_val bigint;
  code_str text;
begin
  select nextval('public.studio_enquiry_seq') into seq_val;
  if seq_val < 1000 then
    code_str := 'SXD-' || lpad(seq_val::text, 3, '0');
  else
    code_str := 'SXD-' || seq_val::text;
  end if;
  return code_str;
end;
$$;

revoke all on function public.studio_generate_tracking_code() from public, anon;
grant execute on function public.studio_generate_tracking_code() to service_role, authenticated;

-- 2. Enhance studio_enquiries with Tracking Code and Detailed Contact Fields
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'tracking_code') then
    alter table public.studio_enquiries add column tracking_code text unique;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'phone') then
    alter table public.studio_enquiries add column phone text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'whatsapp') then
    alter table public.studio_enquiries add column whatsapp text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'preferred_contact') then
    alter table public.studio_enquiries add column preferred_contact text default 'email';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'city') then
    alter table public.studio_enquiries add column city text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'country') then
    alter table public.studio_enquiries add column country text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'website_url') then
    alter table public.studio_enquiries add column website_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'is_individual') then
    alter table public.studio_enquiries add column is_individual boolean default false;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_enquiries' and column_name = 'project_id') then
    alter table public.studio_enquiries add column project_id uuid;
  end if;
end $$;

-- Backfill any existing enquiries that lack a tracking code
do $$
declare
  rec record;
  counter bigint := 1;
begin
  for rec in select id from public.studio_enquiries where tracking_code is null order by created_at asc loop
    update public.studio_enquiries
    set tracking_code = 'SXD-' || lpad(counter::text, 3, '0')
    where id = rec.id;
    counter := counter + 1;
  end loop;

  if counter > 1 then
    perform setval('public.studio_enquiry_seq', counter);
  end if;
end $$;

create index if not exists studio_enquiries_tracking on public.studio_enquiries(tracking_code);

-- 3. Active Projects Management Table
create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references public.studio_enquiries(id) on delete set null,
  tracking_code text not null unique,
  title text not null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  company text,
  service text not null,
  status text not null default 'under_review',
  agreed_scope text,
  estimated_price text,
  agreed_price text,
  start_date date,
  target_date date,
  completed_date date,
  progress_pct integer default 0 check (progress_pct >= 0 and progress_pct <= 100),
  milestones jsonb default '[]'::jsonb,
  public_update text,
  public_update_time timestamptz,
  internal_notes text,
  live_url text,
  delivery_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_projects enable row level security;
revoke all on public.studio_projects from public, anon;
grant all on public.studio_projects to service_role;
grant select, insert, update, delete on public.studio_projects to authenticated;

create policy owner_projects on public.studio_projects for all to authenticated
using ((select studio_private.owner_unlocked())) with check ((select studio_private.owner_unlocked()));

create index if not exists studio_projects_tracking on public.studio_projects(tracking_code);
create index if not exists studio_projects_status on public.studio_projects(status);

-- 4. Transactional Email Outbox & Audit History
create table if not exists public.studio_emails (
  id uuid primary key default gen_random_uuid(),
  tracking_code text,
  template text not null,
  recipient text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.studio_emails enable row level security;
revoke all on public.studio_emails from public, anon;
grant all on public.studio_emails to service_role;
grant select on public.studio_emails to authenticated;

create policy owner_emails on public.studio_emails for select to authenticated
using ((select studio_private.owner_unlocked()));

create index if not exists studio_emails_tracking on public.studio_emails(tracking_code);
create index if not exists studio_emails_status on public.studio_emails(status);

-- 5. Customer Tracking Verification Tokens (for privacy protection on /track)
create table if not exists public.studio_tracking_verifications (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null,
  email text not null,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.studio_tracking_verifications enable row level security;
revoke all on public.studio_tracking_verifications from public, anon, authenticated;
grant all on public.studio_tracking_verifications to service_role;

create index if not exists studio_verifications_token on public.studio_tracking_verifications(token);
create index if not exists studio_verifications_code on public.studio_tracking_verifications(tracking_code);

-- 6. Enable Realtime Publications for studio_projects and studio_emails if supported
do $$
begin
  begin
    alter publication supabase_realtime add table public.studio_projects;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.studio_emails;
  exception when others then null;
  end;
end $$;
