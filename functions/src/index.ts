import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import {
  escapeEmail,
  nextDigestAt,
  nextEmailRun,
  validateEmailPlan,
} from "../../shared/email.js";
import {
  deliverEmailPlan,
  DeliveryError,
  MIN_EMAIL_INTERVAL,
  type EmailTransport,
  type StoredEmailPlan,
} from "./delivery.js";
import { resendTransport } from "./resend.js";
import { verifiedOwner } from "./verification.js";

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 3, memory: "256MiB" });
const db = getFirestore();
const resendKey = defineSecret("RESEND_API_KEY");
const sender = defineString("EMAIL_FROM");
const publicApp = defineString("PUBLIC_APP_URL", {
  default: "https://tab-brain-memory.vercel.app",
});
const callableOptions = { enforceAppCheck: true, timeoutSeconds: 60 };

function verifiedTransport(
  uid: string,
  transport: EmailTransport,
): EmailTransport {
  return async (request) => {
    let account;
    try {
      account = await getAuth().getUser(uid);
    } catch (error) {
      if ((error as { code?: string }).code === "auth/user-not-found")
        throw new DeliveryError(
          "The delivery account no longer exists.",
          false,
        );
      throw error;
    }
    if (
      account.disabled ||
      !account.emailVerified ||
      account.email !== request.to
    )
      throw new DeliveryError(
        "The delivery address needs to be verified again.",
        false,
      );
    return transport(request);
  };
}
function publicPlan(plan: StoredEmailPlan) {
  return {
    enabled: plan.enabled,
    frequency: plan.frequency,
    timeZone: plan.timeZone,
    hour: plan.hour,
    weekday: plan.weekday,
    includeSummaries: plan.includeSummaries,
    reminderEmails: plan.reminderEmails,
    bookmarks: plan.bookmarks,
    nextDigestAt: plan.nextDigestAt,
    nextRunAt: plan.nextRunAt,
    lastDeliveryAt: plan.lastDeliveryAt ?? null,
    lastError: plan.lastError ?? null,
  };
}
function deliveryOptions() {
  const project =
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  if (!project)
    throw new HttpsError(
      "failed-precondition",
      "The email service needs its Firebase project configuration.",
    );
  const from = sender.value();
  if (!from || /[\r\n]/.test(from))
    throw new HttpsError(
      "failed-precondition",
      "The email sender needs to be configured.",
    );
  return {
    from,
    workspaceUrl: publicApp.value() + "/#reminders",
    unsubscribeBaseUrl: `https://us-central1-${project}.cloudfunctions.net/unsubscribeEmail`,
  };
}

export const getEmailPlan = onCall(callableOptions, async (request) => {
  const owner = verifiedOwner(request);
  const snapshot = await db.collection("emailPlans").doc(owner.uid).get();
  return snapshot.exists
    ? publicPlan(snapshot.data() as StoredEmailPlan)
    : null;
});
export const saveEmailPlan = onCall(callableOptions, async (request) => {
  const owner = verifiedOwner(request);
  let input;
  try {
    input = validateEmailPlan(request.data);
  } catch (error) {
    throw new HttpsError(
      "invalid-argument",
      error instanceof Error
        ? error.message
        : "Review the email plan and try again.",
    );
  }
  const now = new Date();
  const nowText = now.toISOString();
  const reference = db.collection("emailPlans").doc(owner.uid);
  const plan = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const previous = snapshot.data() as StoredEmailPlan | undefined;
    if (previous && Date.parse(previous.lastSavedAt) + 10_000 > now.getTime())
      throw new HttpsError(
        "resource-exhausted",
        "Wait a few seconds before saving your email plan again.",
      );
    const sentReminderAt = Object.fromEntries(
      input.bookmarks
        .filter(
          (bookmark) =>
            bookmark.reminderAt &&
            previous?.sentReminderAt[bookmark.id] === bookmark.reminderAt,
        )
        .map((bookmark) => [bookmark.id, bookmark.reminderAt!]),
    );
    const nextDigest = nextDigestAt(input, now);
    const nextRun = nextEmailRun(nextDigest, input.bookmarks, sentReminderAt);
    // Keep the cooldown when an edit cancels a delivery whose provider response is still unknown.
    const lastAttemptAt =
      previous?.lastAttemptAt ?? previous?.pending?.createdAt;
    const latestAttempt = Math.max(
      Date.parse(lastAttemptAt ?? "") || 0,
      Date.parse(previous?.lastDeliveryAt ?? "") || 0,
    );
    const earliest = new Date(
      Math.max(now.getTime(), latestAttempt + MIN_EMAIL_INTERVAL),
    ).toISOString();
    const next: StoredEmailPlan = {
      ...input,
      uid: owner.uid,
      email: owner.email,
      enabled: true,
      revision: randomUUID(),
      unsubscribeToken:
        previous?.unsubscribeToken ?? randomBytes(32).toString("hex"),
      createdAt: previous?.createdAt ?? nowText,
      consentAt: nowText,
      lastSavedAt: nowText,
      nextDigestAt: nextDigest,
      nextRunAt: nextRun > earliest ? nextRun : earliest,
      sentReminderAt,
      ...(lastAttemptAt ? { lastAttemptAt } : {}),
      ...(previous?.lastDeliveryAt
        ? { lastDeliveryAt: previous.lastDeliveryAt }
        : {}),
    };
    transaction.set(reference, next);
    return next;
  });
  return publicPlan(plan);
});
export const deleteEmailPlan = onCall(callableOptions, async (request) => {
  const owner = verifiedOwner(request);
  await db.collection("emailPlans").doc(owner.uid).delete();
  return { removed: true };
});
export const sendEmailBriefNow = onCall(
  { ...callableOptions, secrets: [resendKey] },
  async (request) => {
    const owner = verifiedOwner(request);
    const result = await deliverEmailPlan(
      db,
      owner.uid,
      verifiedTransport(owner.uid, resendTransport(resendKey.value())),
      { ...deliveryOptions(), forceDigest: true },
    );
    if (result === "missing")
      throw new HttpsError(
        "failed-precondition",
        "Review and save your email plan before sending a brief.",
      );
    if (result === "paused")
      throw new HttpsError(
        "failed-precondition",
        "Email delivery is paused. Check the sender setup and save your plan again.",
      );
    return { result };
  },
);
export const deliverScheduledEmails = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "UTC",
    maxInstances: 1,
    timeoutSeconds: 300,
    retryCount: 0,
    secrets: [resendKey],
  },
  async () => {
    const started = Date.now();
    const plans = await db
      .collection("emailPlans")
      .where("enabled", "==", true)
      .where("nextRunAt", "<=", new Date().toISOString())
      .orderBy("nextRunAt")
      .limit(50)
      .get();
    const counts = { sent: 0, deferred: 0, paused: 0, missing: 0, errors: 0 };
    const options = deliveryOptions();
    const transport = resendTransport(resendKey.value());
    for (const plan of plans.docs) {
      if (Date.now() - started > 240_000) break;
      try {
        counts[
          await deliverEmailPlan(
            db,
            plan.id,
            verifiedTransport(plan.id, transport),
            options,
          )
        ]++;
      } catch {
        counts.errors++;
      }
    }
    logger.info("The scheduled email run finished.", counts);
  },
);

export const unsubscribeEmail = onRequest(
  { timeoutSeconds: 30 },
  async (request, response) => {
    response.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
    if (!["GET", "POST"].includes(request.method)) {
      response
        .set("Allow", "GET, POST")
        .status(405)
        .send("Use the unsubscribe link in your email.");
      return;
    }
    const uid = typeof request.query.uid === "string" ? request.query.uid : "";
    const token =
      typeof request.query.token === "string" ? request.query.token : "";
    const validShape =
      /^[A-Za-z0-9_-]{1,128}$/.test(uid) && /^[a-f0-9]{64}$/.test(token);
    let valid = false;
    if (validShape) {
      const reference = db.collection("emailPlans").doc(uid);
      valid = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        const saved = snapshot.data()?.unsubscribeToken;
        if (
          typeof saved !== "string" ||
          !/^[a-f0-9]{64}$/.test(saved) ||
          !timingSafeEqual(Buffer.from(saved, "hex"), Buffer.from(token, "hex"))
        )
          return false;
        if (request.method === "POST") transaction.delete(reference);
        return true;
      });
    }
    const heading = valid
      ? request.method === "GET"
        ? "Stop your Tab Brain emails?"
        : "Your email deliveries have been stopped."
      : "This email plan is already stopped, or the link has expired.";
    const action = `?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
    const button =
      valid && request.method === "GET"
        ? `<form method="post" action="${escapeEmail(action)}"><button style="padding:12px 18px;background:#486739;color:white;border:0;border-radius:7px">Stop emails and remove the approved bookmark copy</button></form>`
        : "";
    response
      .status(200)
      .type("html")
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tab Brain email settings</title></head><body style="font:16px/1.8 system-ui;background:#f5f8ee;color:#48623a;padding:24px"><main style="max-width:560px;margin:60px auto"><h1 style="font:32px Georgia,serif">${heading}</h1><p>Your saved pages and notes stay in your browser.</p>${button}<p><a href="${escapeEmail(publicApp.value())}" style="color:#486739">Open Tab Brain</a></p></main></body></html>`,
      );
  },
);
