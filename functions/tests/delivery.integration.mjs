import { beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { deliverEmailPlan, DeliveryError } from "../lib/delivery.js";

if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST ?? ""))
  throw new Error(
    "These tests require the local Firestore emulator. They never use a real Firebase project.",
  );
const app = initializeApp({ projectId: "demo-tab-brain" });
const db = getFirestore(app);
const instant = "2026-11-18T10:00:00.000Z";
const bookmark = {
  id: "one",
  title: "One approved page",
  url: "https://example.com/one",
  summary: "Its saved short summary.",
  savedAt: "2026-11-18T09:00:00.000Z",
};
const plan = (overrides = {}) => ({
  uid: "owner-id",
  email: "reader@example.invalid",
  frequency: "daily",
  timeZone: "Africa/Lagos",
  hour: 8,
  weekday: 1,
  includeSummaries: true,
  reminderEmails: false,
  consent: true,
  enabled: true,
  revision: "initial-revision",
  unsubscribeToken: "a".repeat(64),
  createdAt: instant,
  consentAt: instant,
  lastSavedAt: instant,
  nextDigestAt: "2026-11-18T07:00:00.000Z",
  nextRunAt: "2026-11-18T07:00:00.000Z",
  sentReminderAt: {},
  bookmarks: [bookmark],
  ...overrides,
});
const reference = db.collection("emailPlans").doc("owner-id");
const options = {
  from: "Tab Brain <reading@example.invalid>",
  workspaceUrl: "https://example.com/workspace",
  unsubscribeBaseUrl: "https://example.com/stop",
  now: () => new Date(instant),
};
beforeEach(async () => {
  const documents = await db.collection("emailPlans").get();
  const batch = db.batch();
  documents.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
});
after(async () => {
  await db.terminate();
  await deleteApp(app);
});

test("two workers share a durable lease and only one sends the due brief", async () => {
  await reference.set(plan());
  const calls = [];
  const transport = async (request) => {
    calls.push(request);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return { id: "accepted-once" };
  };
  const results = await Promise.all([
    deliverEmailPlan(db, "owner-id", transport, options),
    deliverEmailPlan(db, "owner-id", transport, options),
  ]);
  assert.deepEqual(results.sort(), ["deferred", "sent"]);
  assert.equal(calls.length, 1);
  const saved = (await reference.get()).data();
  assert.equal(saved.lastDeliveryId, "accepted-once");
  assert.equal(saved.pending, undefined);
  assert.equal(saved.nextDigestAt, "2026-11-19T07:00:00.000Z");
});
test("a lost provider response retries the same frozen message after a worker restart", async () => {
  await reference.set(plan());
  const calls = [];
  assert.equal(
    await deliverEmailPlan(
      db,
      "owner-id",
      async (request) => {
        calls.push(request);
        throw new Error("Connection dropped after acceptance");
      },
      options,
    ),
    "deferred",
  );
  assert.equal(
    await deliverEmailPlan(
      db,
      "owner-id",
      async (request) => {
        calls.push(request);
        return { id: "accepted-original" };
      },
      {
        ...options,
        from: "Changed sender <changed@example.invalid>",
        unsubscribeBaseUrl: "https://example.com/changed",
        now: () => new Date(Date.parse(instant) + 16 * 60_000),
      },
    ),
    "sent",
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], calls[0]);
  assert.equal(
    (await reference.get()).data().lastDeliveryId,
    "accepted-original",
  );
});
test("deleting a queued plan before transport prevents delivery", async () => {
  await reference.set(plan());
  let calls = 0;
  const cancellingDb = {
    collection: (name) => db.collection(name),
    runTransaction: async (callback) => {
      const value = await db.runTransaction(callback);
      await reference.delete();
      return value;
    },
  };
  assert.equal(
    await deliverEmailPlan(
      cancellingDb,
      "owner-id",
      async () => {
        calls++;
        return { id: "unexpected" };
      },
      options,
    ),
    "deferred",
  );
  assert.equal(calls, 0);
  assert.equal((await reference.get()).exists, false);
});
test("reminder emails contain only due pages and each date is delivered once", async () => {
  const due = { ...bookmark, reminderAt: "2026-11-18T09:59:00.000Z" };
  const later = {
    ...bookmark,
    id: "two",
    title: "A future page",
    url: "https://example.com/two",
    reminderAt: "2026-11-18T12:00:00.000Z",
  };
  await reference.set(
    plan({
      reminderEmails: true,
      bookmarks: [due, later],
      nextDigestAt: "2026-11-19T07:00:00.000Z",
      nextRunAt: due.reminderAt,
    }),
  );
  const calls = [];
  const transport = async (request) => {
    calls.push(request);
    return { id: "reminder-1" };
  };
  assert.equal(
    await deliverEmailPlan(db, "owner-id", transport, options),
    "sent",
  );
  assert.ok(calls[0].message.text.includes(due.title));
  assert.equal(calls[0].message.text.includes(later.title), false);
  const saved = (await reference.get()).data();
  assert.equal(saved.sentReminderAt.one, due.reminderAt);
  assert.equal(saved.nextDigestAt, "2026-11-19T07:00:00.000Z");
  assert.equal(
    await deliverEmailPlan(db, "owner-id", transport, options),
    "deferred",
  );
  assert.equal(calls.length, 1);
});
test("a permanent sender failure pauses the plan immediately", async () => {
  await reference.set(plan());
  let calls = 0;
  const transport = async () => {
    calls++;
    throw new DeliveryError("Sender rejected", false);
  };
  assert.equal(
    await deliverEmailPlan(db, "owner-id", transport, options),
    "paused",
  );
  assert.equal((await reference.get()).data().enabled, false);
  assert.equal(
    await deliverEmailPlan(db, "owner-id", transport, options),
    "deferred",
  );
  assert.equal(calls, 1);
});
test("four failed attempts or an old uncertain request pause rather than issuing a new retry key", async () => {
  await reference.set(plan());
  const keys = [];
  const transport = async (request) => {
    keys.push(request.idempotencyKey);
    throw new DeliveryError("Provider is busy", true);
  };
  for (let i = 0; i < 4; i++)
    assert.equal(
      await deliverEmailPlan(db, "owner-id", transport, {
        ...options,
        now: () => new Date(Date.parse(instant) + i * 16 * 60_000),
      }),
      i === 3 ? "paused" : "deferred",
    );
  assert.equal(new Set(keys).size, 1);
  assert.equal((await reference.get()).data().enabled, false);
  await reference.set(plan());
  await deliverEmailPlan(db, "owner-id", transport, options);
  const count = keys.length;
  assert.equal(
    await deliverEmailPlan(db, "owner-id", transport, {
      ...options,
      now: () => new Date(Date.parse(instant) + 13 * 60 * 60_000),
    }),
    "paused",
  );
  assert.equal(keys.length, count);
});
test("sending a brief now preserves the regular schedule and respects the hourly limit", async () => {
  await reference.set(
    plan({
      nextDigestAt: "2026-11-19T07:00:00.000Z",
      nextRunAt: "2026-11-19T07:00:00.000Z",
    }),
  );
  let calls = 0;
  const transport = async () => {
    calls++;
    return { id: "manual-1" };
  };
  assert.equal(
    await deliverEmailPlan(db, "owner-id", transport, {
      ...options,
      forceDigest: true,
    }),
    "sent",
  );
  assert.equal(
    (await reference.get()).data().nextDigestAt,
    "2026-11-19T07:00:00.000Z",
  );
  assert.equal(
    await deliverEmailPlan(db, "owner-id", transport, {
      ...options,
      forceDigest: true,
    }),
    "deferred",
  );
  assert.equal(calls, 1);
});

test("editing a plan during delivery keeps the cooldown even before a provider receipt arrives", async () => {
  await reference.set(plan());
  let entered;
  const sending = new Promise((resolve) => {
    entered = resolve;
  });
  let finish;
  const receipt = new Promise((resolve) => {
    finish = resolve;
  });
  const calls = [];
  const first = deliverEmailPlan(
    db,
    "owner-id",
    async (request) => {
      calls.push(request);
      entered();
      return receipt;
    },
    options,
  );
  await sending;
  const previous = (await reference.get()).data();
  // Saving a fresh approved copy removes the queued message, while retaining the last attempt time.
  await reference.set(
    plan({
      revision: "edited-revision",
      lastAttemptAt: previous.lastAttemptAt,
      lastSavedAt: "2026-11-18T10:01:00.000Z",
    }),
  );
  const afterEdit = {
    ...options,
    forceDigest: true,
    now: () => new Date("2026-11-18T10:16:00.000Z"),
  };
  assert.equal(
    await deliverEmailPlan(
      db,
      "owner-id",
      async (request) => {
        calls.push(request);
        return { id: "unexpected-second" };
      },
      afterEdit,
    ),
    "deferred",
  );
  assert.equal(calls.length, 1);
  finish({ id: "accepted-before-edit" });
  assert.equal(await first, "sent");
  assert.equal((await reference.get()).data().lastDeliveryAt, instant);

  // The same protection applies when a response was lost and an edit cancels its pending retry.
  await reference.set(plan());
  await deliverEmailPlan(
    db,
    "owner-id",
    async () => {
      throw new Error("The provider response was lost");
    },
    options,
  );
  await reference.update({
    revision: "edited-after-loss",
    pending: FieldValue.delete(),
    leaseUntil: FieldValue.delete(),
  });
  assert.equal(
    await deliverEmailPlan(
      db,
      "owner-id",
      async () => {
        throw new Error("A new message must wait");
      },
      afterEdit,
    ),
    "deferred",
  );
  assert.equal(
    await deliverEmailPlan(
      db,
      "owner-id",
      async () => ({ id: "new-copy-after-cooldown" }),
      {
        ...options,
        forceDigest: true,
        now: () => new Date("2026-11-18T11:01:00.000Z"),
      },
    ),
    "sent",
  );
});
