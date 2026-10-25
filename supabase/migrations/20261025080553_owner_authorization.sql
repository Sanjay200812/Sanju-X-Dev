-- Exact owner identity plus a PIN-unlocked auth session. No user-editable claims.
create schema if not exists studio_private;
revoke all on schema studio_private from public;
grant usage on schema studio_private to authenticated;
create function studio_private.owner_unlocked() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = '3984ceee-869a-432f-a5dd-23eb615d234d'::uuid
    and exists(select 1 from public.studio_sessions s
      where s.owner_id = (select auth.uid())
      and s.auth_session::text = (select auth.jwt()->>'session_id')
      and s.expires_at > now())
    and exists(select 1 from auth.sessions a where a.id::text = (select auth.jwt()->>'session_id') and a.user_id=(select auth.uid()));
$$;
revoke all on function studio_private.owner_unlocked() from public,anon;
grant execute on function studio_private.owner_unlocked() to authenticated;
grant select,insert,update,delete on public.studio_content,public.studio_enquiries to authenticated;
grant select on public.studio_audit to authenticated;
create policy owner_content on public.studio_content for all to authenticated
using ((select studio_private.owner_unlocked())) with check ((select studio_private.owner_unlocked()));
create policy owner_enquiries on public.studio_enquiries for all to authenticated
using ((select studio_private.owner_unlocked())) with check ((select studio_private.owner_unlocked()));
create policy owner_activity on public.studio_audit for select to authenticated
using ((select studio_private.owner_unlocked()));
create policy owner_media on storage.objects for all to authenticated
using (bucket_id='studio-media' and (select studio_private.owner_unlocked()))
with check (bucket_id='studio-media' and (select studio_private.owner_unlocked()));
-- Session verifiers and rate-limit state remain service-only, with no client grants.
