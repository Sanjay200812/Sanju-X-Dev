import test from "node:test";
import assert from "node:assert/strict";
import handler, { configureEnvironment } from "../server/handler.mjs";
import { createPinVerifier, verifyPin } from "../server/security.mjs";
test("secondary code verifiers are salted and validate without storing plaintext", () => {
  const a = createPinVerifier("5837"),
    b = createPinVerifier("5837");
  assert.notEqual(a, b);
  assert.equal(verifyPin("5837", a), true);
  assert.equal(verifyPin("5838", a), false);
  assert.throws(() => createPinVerifier("bad"));
});
test("server rejects a different authenticated UID before any private table access", async () => {
  const original = global.fetch;
  let calls = 0;
  configureEnvironment({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
  });
  global.fetch = async () => {
    calls++;
    return Response.json({ id: "11111111-1111-4111-8111-111111111111" });
  };
  let code, body;
  try {
    await handler(
      {
        url: "/api/admin",
        method: "GET",
        headers: { authorization: "Bearer fake-token" },
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
    assert.equal(code, 403);
    assert.equal(body.error, "Owner access only.");
    assert.equal(calls, 1);
  } finally {
    global.fetch = original;
    configureEnvironment(undefined);
  }
});
