import { test } from "node:test";
import assert from "node:assert/strict";
import { verifiedOwner } from "../lib/verification.js";
import { resendTransport } from "../lib/resend.js";

test("email plans require a verified Firebase identity", () => {
  assert.throws(() => verifiedOwner({ auth: undefined }), /Sign in/);
  const auth = {
    uid: "owner-id",
    token: { email: "reader@example.invalid", email_verified: false },
  };
  assert.throws(() => verifiedOwner({ auth }), /verified/);
  assert.deepEqual(
    verifiedOwner({
      auth: { ...auth, token: { ...auth.token, email_verified: true } },
    }),
    { uid: "owner-id", email: "reader@example.invalid" },
  );
  assert.throws(
    () =>
      verifiedOwner({
        auth: {
          ...auth,
          token: {
            email: "reader@example.invalid\r\nBcc:someone",
            email_verified: true,
          },
        },
      }),
    /verified/,
  );
});
const request = {
  to: "reader@example.invalid",
  from: "Tab Brain <reading@example.invalid>",
  idempotencyKey: "stable-delivery-key",
  unsubscribeUrl: "https://example.com/stop?token=example",
  message: {
    subject: "My brief",
    html: "<p>An approved bookmark.</p>",
    text: "An approved bookmark.",
  },
};
test("the mocked provider receives a stable retry key and one-click unsubscribe headers", async () => {
  const calls = [];
  const fetcher = async (...args) => {
    calls.push(args);
    return new Response(JSON.stringify({ id: "delivery-1" }), { status: 200 });
  };
  assert.equal(
    (await resendTransport("TEST_NOT_A_REAL_KEY", fetcher)(request)).id,
    "delivery-1",
  );
  const [url, options] = calls[0];
  const body = JSON.parse(options.body);
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(options.headers["Idempotency-Key"], request.idempotencyKey);
  assert.deepEqual(body.to, ["reader@example.invalid"]);
  assert.equal(
    body.headers["List-Unsubscribe-Post"],
    "List-Unsubscribe=One-Click",
  );
  assert.equal(options.body.includes("TEST_NOT_A_REAL_KEY"), false);
});
test("rate limits can retry and rejected sender setup pauses delivery", async () => {
  await assert.rejects(
    () =>
      resendTransport(
        "TEST_KEY",
        async () => new Response("{}", { status: 429 }),
      )(request),
    (error) => error.retryable === true,
  );
  await assert.rejects(
    () =>
      resendTransport(
        "TEST_KEY",
        async () => new Response("{}", { status: 403 }),
      )(request),
    (error) => error.retryable === false,
  );
});
