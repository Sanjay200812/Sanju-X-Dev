create table public.studio_content(id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table public.studio_enquiries(id uuid primary key default gen_random_uuid(),data jsonb not null,status text not null default 'new' check(status in ('new','in-progress','closed')),notes text not null default '',created_at timestamptz not null default now());
create table public.studio_sessions(hash text primary key,owner_id uuid not null,auth_session uuid not null,expires_at timestamptz not null);
create table public.studio_audit(id bigint generated always as identity primary key,action text not null,created_at timestamptz not null default now());
create table public.studio_limits(key text primary key,hits integer not null,expires_at timestamptz not null);
alter table public.studio_content enable row level security;
alter table public.studio_enquiries enable row level security;
alter table public.studio_sessions enable row level security;
alter table public.studio_audit enable row level security;
alter table public.studio_limits enable row level security;
revoke all on public.studio_content,public.studio_enquiries,public.studio_sessions,public.studio_audit,public.studio_limits from anon,authenticated;
grant all on public.studio_content,public.studio_enquiries,public.studio_sessions,public.studio_audit,public.studio_limits to service_role;
grant usage,select on sequence public.studio_audit_id_seq to service_role;
create index studio_enquiries_created on public.studio_enquiries(created_at desc);
create index studio_sessions_owner on public.studio_sessions(owner_id);
create function public.studio_limit(key_value text,maximum integer,seconds integer) returns boolean language plpgsql security invoker set search_path='' as $$
declare count_value integer;
begin
insert into public.studio_limits(key,hits,expires_at) values(key_value,1,now()+make_interval(secs=>seconds))
on conflict(key) do update set hits=case when public.studio_limits.expires_at<now() then 1 else public.studio_limits.hits+1 end,expires_at=case when public.studio_limits.expires_at<now() then now()+make_interval(secs=>seconds) else public.studio_limits.expires_at end returning hits into count_value;
return count_value<=maximum;
end;$$;
revoke all on function public.studio_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.studio_limit(text,integer,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('studio-media','studio-media',true,3145728,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
