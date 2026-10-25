import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
test("migration, private storage of enquiries and atomic rate limit", async () => {
  const db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  await db.exec(
    await fs.readFile(
      "supabase/migrations/20261022115919_premium_studio.sql",
      "utf8",
    ),
  );
  await db.exec(
    'insert into public.studio_enquiries(data) values (\'{"name":"QA"}\');',
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.studio_enquiries"))
      .rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from pg_tables where schemaname='public' and rowsecurity",
      )
    ).rows[0].n,
    5,
  );
  for (let i = 0; i < 6; i++)
    assert.equal(
      (await db.query("select public.studio_limit('test',5,3600) as allowed"))
        .rows[0].allowed,
      i < 5,
    );
  await db.exec("set role anon");
  await assert.rejects(db.query("select * from public.studio_enquiries"));
  await assert.rejects(db.query("select public.studio_limit('test',5,3600)"));
  await db.close();
});
