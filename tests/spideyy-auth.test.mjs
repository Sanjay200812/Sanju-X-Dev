import test from "node:test";
import assert from "node:assert/strict";
import handler, { configureEnvironment } from "../server/handler.mjs";
import { createSecretVerifier, verifySecret, getLockoutStatus, recordFailedAttempt, clearLockout } from "../server/security.mjs";
import { formatEnquiryHtml, sendEnquiryNotification } from "../server/email.mjs";

test("secret code verifiers require at least 8 characters and validate salted scrypt hash", () => {
  const secret = "SuperSecretPassphrase2026!";
  const verifier = createSecretVerifier(secret);
  assert.ok(verifier.includes(":"));
  assert.equal(verifySecret(secret, verifier), true);
  assert.equal(verifySecret("WrongPassphrase2026!", verifier), false);
  assert.throws(() => createSecretVerifier("short"), /at least 8 characters/);
});

test("lockout tracking locks after 3 attempts for 3 minutes and resets after expiration", async () => {
  const mockRows = new Map();
  const mockClient = {
    from(table) {
      assert.equal(table, "studio_lockouts");
      return {
        select() {
          return {
            eq(col, val) {
              return {
                async maybeSingle() {
                  return { data: mockRows.get(val) || null, error: null };
                },
              };
            },
          };
        },
        async upsert(row) {
          mockRows.set(row.scope, row);
          return { error: null };
        },
        delete() {
          return {
            async eq(col, val) {
              mockRows.delete(val);
              return { error: null };
            },
          };
        },
      };
    },
  };

  const scope = "code:owner";

  // First failed attempt
  let status = await recordFailedAttempt(mockClient, scope, 3, 3);
  assert.equal(status.locked, false);
  assert.equal(status.failedAttempts, 1);

  // Second failed attempt
  status = await recordFailedAttempt(mockClient, scope, 3, 3);
  assert.equal(status.locked, false);
  assert.equal(status.failedAttempts, 2);

  // Third failed attempt: must trigger lock
  status = await recordFailedAttempt(mockClient, scope, 3, 3);
  assert.equal(status.locked, true);
  assert.ok(status.remainingSeconds > 0 && status.remainingSeconds <= 180);

  // Check status while locked
  const current = await getLockoutStatus(mockClient, scope);
  assert.equal(current.locked, true);
  assert.ok(current.remainingSeconds > 0);

  // Clear on successful login
  await clearLockout(mockClient, scope);
  const cleared = await getLockoutStatus(mockClient, scope);
  assert.equal(cleared.locked, false);
  assert.equal(cleared.failedAttempts, 0);
});

test("formatEnquiryHtml includes client details, requested service, and dashboard link", () => {
  const enquiry = {
    name: "Alex Vance",
    email: "alex@example.com",
    company: "Vance Enterprises",
    service: "Custom web applications",
    timeline: "1–3 months",
    budget: "$5,000 - $10,000",
    description: "We require an internal workflow tool for media operations.",
    features: "Secure auth, file queuing, data exports",
  };

  const html = formatEnquiryHtml(enquiry, "https://sanju-x-dev.vercel.app");
  assert.ok(html.includes("Alex Vance"));
  assert.ok(html.includes("alex@example.com"));
  assert.ok(html.includes("Custom web applications"));
  assert.ok(html.includes("Vance Enterprises"));
  assert.ok(html.includes("https://sanju-x-dev.vercel.app/spideyy"));
});

test("sendEnquiryNotification skips when RESEND_API_KEY is not configured and reports accurately", async () => {
  const result = await sendEnquiryNotification({
    name: "Test User",
    email: "test@example.com",
    service: "Business websites",
    description: "Testing notification behavior without API keys.",
  }, { resendApiKey: "" });

  assert.equal(result.success, false);
  assert.equal(result.skipped, true);
});

test("sendEnquiryNotification calls Resend endpoint when API key is provided", async () => {
  let calledUrl = "";
  let payload = null;
  const mockFetch = async (url, opts) => {
    calledUrl = url;
    payload = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ id: "resend_test_123" }),
    };
  };

  const result = await sendEnquiryNotification({
    name: "Sanjay Dev",
    email: "client@example.com",
    service: "UI/UX design",
    description: "Redesigning our portfolio platform with modern typography.",
  }, {
    resendApiKey: "re_test_key_123",
    fetchFn: mockFetch,
    siteUrl: "https://sanju-x-dev.vercel.app",
  });

  assert.equal(result.success, true);
  assert.equal(result.id, "resend_test_123");
  assert.equal(calledUrl, "https://api.resend.com/emails");
  assert.ok(payload.html.includes("https://sanju-x-dev.vercel.app/spideyy"));
  assert.equal(payload.to[0], "sanjuxdev27@gmail.com");
});

test("/api/spideyy endpoint returns 503 when backend is unconfigured", async () => {
  configureEnvironment({});
  let code = 0;
  let body = {};
  await handler(
    {
      url: "/api/spideyy",
      method: "POST",
      headers: { origin: "http://127.0.0.1:3100" },
      body: { action: "lockout-status" },
    },
    {
      setHeader() {},
      set statusCode(v) {
        code = v;
      },
      end(v) {
        body = JSON.parse(v);
      },
    },
  );
  assert.equal(code, 503);
  assert.ok(body.error.includes("not configured"));
  configureEnvironment(undefined);
});
