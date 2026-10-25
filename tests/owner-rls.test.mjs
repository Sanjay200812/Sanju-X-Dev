import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
test("RLS permits only the exact owner with a live PIN-unlocked auth session", async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text); alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    create schema auth; grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true))$$;
    create table auth.sessions(id uuid,user_id uuid);`);
  for (const name of [
    "20261022115919_premium_studio.sql",
    "20261025080553_owner_authorization.sql",
  ])
    await db.exec(await fs.readFile("supabase/migrations/" + name, "utf8"));
  const owner = "3984ceee-869a-432f-a5dd-23eb615d234d",
    other = "11111111-1111-4111-8111-111111111111",
    session = "22222222-2222-4222-8222-222222222222";
  await db.exec(
    `insert into studio_enquiries(data) values ('{"name":"private"}'); insert into auth.sessions values ('${session}','${owner}'); set role authenticated; select set_config('request.jwt.claim.session_id','${session}',false); select set_config('request.jwt.claim.sub','${other}',false);`,
  );
  assert.equal(
    (await db.query("select * from studio_enquiries")).rows.length,
    0,
  );
  await assert.rejects(
    db.query(`insert into studio_content values ('site','{}',now())`),
  );
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`);
  assert.equal(
    (await db.query("select * from studio_enquiries")).rows.length,
    0,
  );
  await db.exec(
    `reset role; insert into studio_sessions values ('test','${owner}','${session}',now()+interval '30 minutes'); set role authenticated;`,
  );
  assert.equal(
    (await db.query("select * from studio_enquiries")).rows.length,
    1,
  );
  await db.exec(
    `insert into studio_content values ('site','{}',now()); update studio_enquiries set notes='owner update';`,
  );
  assert.equal(
    (await db.query("select notes from studio_enquiries")).rows[0].notes,
    "owner update",
  );
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
  assert.equal(
    (await db.query("select * from studio_enquiries")).rows.length,
    0,
  );
  await db.exec(
    `reset role; update studio_sessions set expires_at=now()-interval '1 second'; set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`,
  );
  assert.equal(
    (await db.query("select * from studio_enquiries")).rows.length,
    0,
  );
  await db.exec(
    `reset role; update studio_sessions set expires_at=now()+interval '30 minutes'; delete from auth.sessions; set role authenticated;`,
  );
  assert.equal(
    (await db.query("select * from studio_enquiries")).rows.length,
    0,
  );
  await assert.rejects(db.query("select * from studio_sessions"));
  await db.close();
});
