import test from "node:test";
import assert from "node:assert/strict";
import handler, { configureEnvironment } from "../server/handler.mjs";
import { createSecretVerifier, verifySecret, getLockoutStatus, recordFailedAttempt, clearLockout } from "../server/security.mjs";
import { formatEnquiryHtml, sendEnquiryNotification, verifySmtpConnection, sendEmail } from "../server/email.mjs";

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

test("sendEnquiryNotification skips when SMTP credentials are not configured and reports accurately", async () => {
  const result = await sendEnquiryNotification({
    name: "Test User",
    email: "test@example.com",
    service: "Business websites",
    description: "Testing notification behavior without SMTP credentials.",
  }, { smtpUser: "", smtpPass: "", resendApiKey: "" });

  assert.equal(result.success, false);
  assert.equal(result.skipped, true);
  assert.ok(result.reason.includes("Gmail SMTP"));
});

test("sendEnquiryNotification dispatches via Gmail SMTP transporter, sending owner notification and customer tracking code", async () => {
  const sentMessages = [];
  const mockTransporter = {
    sendMail: async (mailOptions) => {
      sentMessages.push(mailOptions);
      return { messageId: "mock_smtp_id_" + sentMessages.length };
    },
    verify: async () => true,
  };

  const result = await sendEnquiryNotification(
    {
      name: "Sanjay Dev",
      email: "client@example.com",
      service: "UI/UX design",
      company: "StarX Corp",
      phone: "+91 9876543210",
      description: "Redesigning our portfolio platform with modern typography and fast load speeds.",
      tracking_code: "SXD-108",
    },
    {
      transporter: mockTransporter,
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: "sanjuxdev27@gmail.com",
      fromEmail: '"SANJU X DEV" <sanjuxdev27@gmail.com>',
      toEmail: "sanjuxdev27@gmail.com",
      siteUrl: "https://sanju-x-dev.vercel.app",
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.provider, "Gmail SMTP");
  assert.equal(sentMessages.length, 2);

  // Email 1: Owner inbox notification
  assert.equal(sentMessages[0].to, "sanjuxdev27@gmail.com");
  assert.ok(sentMessages[0].subject.includes("New SANJU X DEV Enquiry — SXD-108"));
  assert.ok(sentMessages[0].html.includes("StarX Corp"));
  assert.ok(sentMessages[0].html.includes("https://sanju-x-dev.vercel.app/spideyy"));

  // Email 2: Customer SXD tracking code confirmation
  assert.equal(sentMessages[1].to, "client@example.com");
  assert.ok(sentMessages[1].subject.includes("SXD-108"));
  assert.ok(sentMessages[1].html.includes("SXD-108"));
  assert.ok(sentMessages[1].html.includes("https://sanju-x-dev.vercel.app/track?code=SXD-108"));
});

test("verifySmtpConnection reports status and handles mock transporter verification", async () => {
  const mockOk = { verify: async () => true };
  const okResult = await verifySmtpConnection({
    smtpUser: "sanjuxdev27@gmail.com",
    smtpPass: "abcd efgh ijkl mnop",
    transporter: mockOk,
  });
  assert.equal(okResult.configured, true);
  assert.equal(okResult.verified, true);
  assert.equal(okResult.host, "smtp.gmail.com");

  const unconfigured = await verifySmtpConnection({ smtpUser: "", smtpPass: "" });
  assert.equal(unconfigured.configured, false);
  assert.equal(unconfigured.verified, false);
});

test("sendEmail redacts sensitive password from error logs upon failure", async () => {
  const secretPass = "supersecretapppass16";
  const failingTransporter = {
    sendMail: async () => {
      throw new Error("Authentication failed for user user@gmail.com with pass " + secretPass);
    },
  };

  const result = await sendEmail({
    to: "owner@gmail.com",
    subject: "Test Fail",
    html: "<p>Test</p>",
    options: {
      transporter: failingTransporter,
      smtpPass: secretPass,
    },
  });

  assert.equal(result.success, false);
  assert.ok(!result.error.includes(secretPass), "Password must be redacted");
  assert.ok(result.error.includes("[REDACTED]"), "Redacted placeholder should be present");
});

test("sendEnquiryNotification falls back to Resend endpoint when legacy API key is provided", async () => {
  const calls = [];
  const mockFetch = async (url, opts) => {
    calls.push({
      url,
      payload: JSON.parse(opts.body),
    });
    return {
      ok: true,
      json: async () => ({ id: "resend_test_" + calls.length }),
    };
  };

  const result = await sendEnquiryNotification({
    name: "Sanjay Dev",
    email: "client@example.com",
    service: "UI/UX design",
    description: "Redesigning our portfolio platform with modern typography.",
  }, {
    smtpUser: "",
    smtpPass: "",
    resendApiKey: "re_test_key_123",
    fetchFn: mockFetch,
    siteUrl: "https://sanju-x-dev.vercel.app",
  });

  assert.equal(result.success, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
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
