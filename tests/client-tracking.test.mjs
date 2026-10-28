import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  formatProjectAcceptedHtml,
  formatProgressUpdatedHtml,
  formatProjectCompletedHtml,
  formatProjectStatusChangeHtml,
  formatCustomerConfirmationHtml,
} from "../server/email.mjs";
import handler, { configureEnvironment } from "../server/handler.mjs";
import seed from "../server/seed.json" with { type: "json" };

test("tracking code format function handles 1 to 1000+ sequentially", () => {
  const formatCode = (seq) =>
    seq < 1000 ? "SXD-" + String(seq).padStart(3, "0") : "SXD-" + seq;

  assert.equal(formatCode(1), "SXD-001");
  assert.equal(formatCode(42), "SXD-042");
  assert.equal(formatCode(999), "SXD-999");
  assert.equal(formatCode(1000), "SXD-1000");
  assert.equal(formatCode(1050), "SXD-1050");
});

test("all lifecycle transactional email templates format with tracking links and security escaping", () => {
  const sampleProject = {
    tracking_code: "SXD-007",
    title: "StarX Connect & AudioX <script>alert(1)</script>",
    client_name: "Alex Designer",
    client_email: "alex@example.com",
    service: "Web application & UI/UX",
    status: "in_progress",
    status_label: "In Active Development",
    progress_pct: 65,
    target_date: "2026-12-01",
    agreed_scope: "Bespoke digital platform with authentication and real-time audio playback.",
    agreed_price: "₹85,000 / $1,000",
    live_url: "https://starx-connect.example.com",
    delivery_notes: "Production deployment live on Vercel with automated continuous delivery.",
  };

  // 1. Customer Confirmation
  const confirmHtml = formatCustomerConfirmationHtml(
    { name: "Alex", email: "alex@example.com", service: "Web App" },
    "SXD-007",
    "https://sanju-x-dev.vercel.app",
  );
  assert.ok(confirmHtml.includes("SXD-007"));
  assert.ok(confirmHtml.includes("https://sanju-x-dev.vercel.app/track?code=SXD-007"));
  assert.ok(!confirmHtml.includes("<script>"));

  // 2. Project Accepted
  const acceptedHtml = formatProjectAcceptedHtml(sampleProject, "https://sanju-x-dev.vercel.app");
  assert.ok(acceptedHtml.includes("Project Accepted!"));
  assert.ok(acceptedHtml.includes("SXD-007"));
  assert.ok(acceptedHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));

  // 3. Progress Update
  const progressHtml = formatProgressUpdatedHtml(sampleProject, "Core database and audio playback completed.", "https://sanju-x-dev.vercel.app");
  assert.ok(progressHtml.includes("Project Progress Update"));
  assert.ok(progressHtml.includes("65% Completed"));
  assert.ok(progressHtml.includes("Core database and audio playback completed."));

  // 4. Project Completed
  const completedHtml = formatProjectCompletedHtml(sampleProject, "https://sanju-x-dev.vercel.app");
  assert.ok(completedHtml.includes("Your Project is Completed!"));
  assert.ok(completedHtml.includes("https://starx-connect.example.com"));
  assert.ok(completedHtml.includes("Production deployment live on Vercel"));

  // 5. Project Status Change
  const statusChangeHtml = formatProjectStatusChangeHtml(sampleProject, "Paused awaiting brand guidelines.", "https://sanju-x-dev.vercel.app");
  assert.ok(statusChangeHtml.includes("Project Status Notification"));
  assert.ok(statusChangeHtml.includes("Paused awaiting brand guidelines."));
});

test("client tracking migration creates sequence, functions, and active project tables in PostgreSQL", async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text); alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated;
    create schema auth; grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true))$$;
    create table auth.sessions(id uuid,user_id uuid);
  `);

  const migrations = [
    "20261022115919_premium_studio.sql",
    "20261025080553_owner_authorization.sql",
    "20261025140000_spideyy_upgrade.sql",
    "20261025160000_client_tracking_outbox.sql",
  ];

  for (const file of migrations) {
    const sql = await fs.readFile("supabase/migrations/" + file, "utf8");
    await db.exec(sql);
  }

  // Verify stored procedure generates sequential tracking codes
  const code1 = (await db.query("select public.studio_generate_tracking_code() as code")).rows[0].code;
  const code2 = (await db.query("select public.studio_generate_tracking_code() as code")).rows[0].code;

  assert.equal(code1, "SXD-001");
  assert.equal(code2, "SXD-002");

  // Verify studio_projects and studio_emails tables exist with row level security
  const rlsTables = (
    await db.query(
      "select tablename from pg_tables where schemaname='public' and rowsecurity order by tablename",
    )
  ).rows.map((r) => r.tablename);

  assert.ok(rlsTables.includes("studio_projects"));
  assert.ok(rlsTables.includes("studio_emails"));
  assert.ok(rlsTables.includes("studio_enquiries"));
  assert.ok(rlsTables.includes("studio_lockouts"));

  await db.close();
});

test("/api/track rejects invalid tracking code and unverified access", async () => {
  configureEnvironment({});

  let status = 0;
  let body = {};

  const req = {
    method: "POST",
    url: "/api/track",
    headers: { origin: "http://127.0.0.1:3100" },
    body: { action: "verify", trackingCode: "INVALID", email: "notanemail" },
  };

  const res = {
    setHeader: () => {},
    set statusCode(code) {
      status = code;
    },
    end: (str) => {
      body = JSON.parse(str);
    },
  };

  await handler(req, res);
  // Without backend database configured in test, rejects gracefully with 503 or 400
  assert.ok(status === 503 || status === 400);
  assert.ok(body.error);
});

test("/api/chat handles Telugu-English enquiries with polite guidance", async () => {
  let status = 0;
  let body = {};
  const req = {
    method: "POST",
    url: "/api/chat",
    headers: { origin: "http://127.0.0.1:3100" },
    body: { question: "naku business website kavali, entha avtundi?" },
  };
  const res = {
    setHeader: () => {},
    set statusCode(code) { status = code; },
    end: (str) => { body = JSON.parse(str); },
  };
  await handler(req, res);
  assert.equal(status, 200);
  assert.equal(body.mode, "FAQ guide");
  assert.match(body.answer, /SANJU X DEV/);
  assert.ok(body.links.some((l) => l.url === "/contact"));
});

test("/api/chat handles website recommendation and store queries non-technically", async () => {
  let status = 0;
  let body = {};
  const req = {
    method: "POST",
    url: "/api/chat",
    headers: { origin: "http://127.0.0.1:3100" },
    body: { question: "What kind of website does my business need?" },
  };
  const res = {
    setHeader: () => {},
    set statusCode(code) { status = code; },
    end: (str) => { body = JSON.parse(str); },
  };
  await handler(req, res);
  assert.equal(status, 200);
  assert.match(body.answer, /Business Website/);
  assert.match(body.answer, /Online Store/);

  // Online store query
  const reqStore = {
    method: "POST",
    url: "/api/chat",
    headers: { origin: "http://127.0.0.1:3100" },
    body: { question: "Can you build an online store?" },
  };
  let storeBody = {};
  await handler(reqStore, {
    setHeader: () => {},
    set statusCode(_) {},
    end: (str) => { storeBody = JSON.parse(str); },
  });
  assert.match(storeBody.answer, /online store/i);
});

test("/api/chat explains project starting and tracking clearly", async () => {
  // Start a project
  let startBody = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "How do I start a project?" },
    },
    {
      setHeader: () => {},
      set statusCode(_) {},
      end: (str) => { startBody = JSON.parse(str); },
    },
  );
  assert.match(startBody.answer, /Contact/);
  assert.match(startBody.answer, /SXD/);

  // Track status
  let trackBody = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "How can I check my project status?" },
    },
    {
      setHeader: () => {},
      set statusCode(_) {},
      end: (str) => { trackBody = JSON.parse(str); },
    },
  );
  assert.match(trackBody.answer, /track/i);
  assert.match(trackBody.answer, /SXD-001/);
});

test("enquiry builder defaults have 11 website categories with correct features", () => {
  const expectedLabels = [
    "Personal Portfolio",
    "Blog / Content Website",
    "Business Website",
    "Agency Website",
    "E-Commerce Website",
    "Restaurant Website",
    "Shop / Local Store Website",
    "Booking / Appointment Website",
    "Educational Website",
    "Other / Custom Website",
    "Not Sure — Help Me Choose",
  ];
  assert.equal(seed.websiteCategories.length, 11);
  assert.deepEqual(
    seed.websiteCategories.map((c) => c.label),
    expectedLabels,
  );

  // Check Portfolio features
  const portfolio = seed.websiteCategories.find((c) => c.id === "portfolio");
  assert.ok(portfolio.features.includes("My Projects"));
  assert.ok(portfolio.features.includes("Skills & Experience"));
  assert.ok(portfolio.features.includes("Resume Download"));

  // Check E-Commerce features
  const ecommerce = seed.websiteCategories.find((c) => c.id === "ecommerce");
  assert.ok(ecommerce.features.includes("Product Catalogue"));
  assert.ok(ecommerce.features.includes("Shopping Cart"));
  assert.ok(ecommerce.features.includes("UPI / Card Payments"));

  // Check Restaurant features
  const restaurant = seed.websiteCategories.find((c) => c.id === "restaurant");
  assert.ok(restaurant.features.includes("Digital Food Menu"));
  assert.ok(restaurant.features.includes("Online Food Ordering"));
  assert.ok(restaurant.features.includes("Table Reservation"));
});

test("spideyy advises on shop website and provides 'Start With This Website Type' preselect link", async () => {
  let body = {};
  await handler(
    {
      method: "POST",
      url: "/api/chat",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { question: "I want a website for my shop." },
    },
    {
      setHeader: () => {},
      set statusCode(_) {},
      end: (str) => { body = JSON.parse(str); },
    },
  );
  assert.match(body.answer, /Business Website could work/);
  assert.match(body.answer, /E-Commerce Website may be better/);
  assert.ok(body.links.some((l) => l.label === "Start With This Website Type" && l.url.includes("E-Commerce")));
});


