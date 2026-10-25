import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import {
  enquiry,
  verifyPin,
  validateSite,
  safeUrl,
  isAllowedOrigin,
} from "../server/security.mjs";
import seed from "../server/seed.json" with { type: "json" };
import handler from "../server/handler.mjs";
const valid = {
  name: "Test Owner",
  email: "test@example.com",
  company: "",
  description: "A new business website with a product catalogue.",
  features: "",
  service: "Business website",
  timeline: "Flexible",
  budget: "",
  consent: true,
};
test("valid enquiry retains consent and trims data", () =>
  assert.equal(enquiry({ ...valid, name: " Test " }).name, "Test"));
test("reject missing consent and malformed email", () => {
  assert.throws(() => enquiry({ ...valid, consent: false }));
  assert.throws(() => enquiry({ ...valid, email: "bad" }));
});
test("reject oversized payload fields", () =>
  assert.throws(() => enquiry({ ...valid, description: "x".repeat(5001) })));
test("PIN uses salted verifier and rejects invalid values", () => {
  const v = "test-salt:" + scryptSync("4718", "test-salt", 64).toString("hex");
  assert.equal(verifyPin("4718", v), true);
  assert.equal(verifyPin("0000", v), false);
  assert.equal(verifyPin("4718", ""), false);
});
test("five projects have requested initial order", () =>
  assert.deepEqual(
    seed.projects.map((p) => p.slug),
    ["starx-live", "ticketx", "starx-connect", "audiox", "yuva-shakti"],
  ));
test("content rejects unsafe image URL and duplicate slugs", () => {
  const x = structuredClone(seed);
  x.projects[0].image = "javascript:alert(1)";
  assert.throws(() => validateSite(x));
  x.projects[0].image = "/ok.webp";
  x.projects[1].slug = x.projects[0].slug;
  assert.throws(() => validateSite(x));
  assert.equal(safeUrl("//evil.test"), false);
});
test("three-theme validation", () => {
  assert.equal(validateSite(seed).defaultTheme, "silver");
  assert.throws(() => validateSite({ ...seed, defaultTheme: "blue" }));
});
async function request(
  url,
  method = "GET",
  body,
  origin = "http://127.0.0.1:3100",
) {
  let result;
  const res = {
    setHeader() {},
    statusCode: 200,
    end(data) {
      result = { code: this.statusCode, body: JSON.parse(data) };
    },
  };
  await handler(
    {
      url,
      method,
      body,
      headers: { origin },
      socket: { remoteAddress: "127.0.0.1" },
    },
    res,
  );
  return result;
}
test("unconfigured site returns real project content", async () => {
  const r = await request("/api/site");
  assert.equal(r.code, 200);
  assert.equal(r.body.site.projects.length, 5);
});
test("enquiries never claim success without persistence", async () => {
  const r = await request("/api/enquiry", "POST", valid);
  assert.equal(r.code, 503);
  assert.equal(r.body.saved, undefined);
});
test("cross-origin writes rejected", async () =>
  assert.equal(
    (await request("/api/enquiry", "POST", valid, "https://evil.test")).code,
    403,
  ));
test("owner API is closed without configuration", async () =>
  assert.equal((await request("/api/admin")).code, 503));
test("assistant labels FAQ mode and handles pricing", async () => {
  const r = await request("/api/chat", "POST", {
    question: "What does a website cost?",
  });
  assert.equal(r.body.mode, "FAQ guide");
  assert.match(r.body.answer, /scope/);
});
test("assistant rejects oversized questions", async () =>
  assert.equal(
    (await request("/api/chat", "POST", { question: "x".repeat(1001) })).code,
    400,
  ));

test("isAllowedOrigin permits production, local dev and project preview deployments strictly", () => {
  assert.equal(isAllowedOrigin("https://sanju-x-dev.vercel.app"), true);
  assert.equal(isAllowedOrigin("https://sanju-x-dev.vercel.app/"), true);
  assert.equal(isAllowedOrigin("http://127.0.0.1:3100"), true);
  assert.equal(isAllowedOrigin("http://localhost:3100"), true);
  assert.equal(isAllowedOrigin("http://localhost:5173"), true);
  assert.equal(isAllowedOrigin("https://sanju-x-dev-git-feature-spideyy-client-management-sanjay200812s-projects.vercel.app"), true);
  assert.equal(isAllowedOrigin("https://sanju-x-dev-bkwyq0s9b-sanjay200812s-projects.vercel.app"), true);
  assert.equal(isAllowedOrigin("https://evil.test"), false);
  assert.equal(isAllowedOrigin("https://attacker.vercel.app"), false);
  assert.equal(isAllowedOrigin(""), false);
  assert.equal(isAllowedOrigin(null), false);
});

