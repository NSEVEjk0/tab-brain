import { randomUUID } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  nextDigestAt,
  nextEmailRun,
  renderEmailBrief,
  type EmailMessage,
  type EmailPlanInput,
} from "../../shared/email.js";

export interface PendingEmail {
  id: string;
  createdAt: string;
  attempts: number;
  from: string;
  message: EmailMessage;
  unsubscribeUrl: string;
  advanceDigest: boolean;
  reminded: Record<string, string>;
}
export interface StoredEmailPlan extends EmailPlanInput {
  uid: string;
  email: string;
  enabled: boolean;
  revision: string;
  unsubscribeToken: string;
  createdAt: string;
  consentAt: string;
  lastSavedAt: string;
  nextDigestAt: string;
  nextRunAt: string;
  sentReminderAt: Record<string, string>;
  pending?: PendingEmail;
  leaseUntil?: string;
  lastAttemptAt?: string;
  lastDeliveryAt?: string;
  lastDeliveryId?: string;
  lastError?: string;
}
export interface DeliveryOptions {
  from: string;
  workspaceUrl: string;
  unsubscribeBaseUrl: string;
  now?: () => Date;
  forceDigest?: boolean;
}
export type EmailTransport = (request: {
  to: string;
  from: string;
  message: EmailMessage;
  idempotencyKey: string;
  unsubscribeUrl: string;
}) => Promise<{ id: string }>;
export class DeliveryError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}
const HOUR = 60 * 60_000;
export const MIN_EMAIL_INTERVAL = HOUR;

export async function deliverEmailPlan(
  db: Firestore,
  uid: string,
  transport: EmailTransport,
  options: DeliveryOptions,
): Promise<"sent" | "deferred" | "paused" | "missing"> {
  const clock = options.now ?? (() => new Date());
  const reference = db.collection("emailPlans").doc(uid);
  const now = clock();
  const nowText = now.toISOString();
  const claim = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) return { result: "missing" as const };
    const plan = snapshot.data() as StoredEmailPlan;
    if (!plan.enabled || (plan.leaseUntil && plan.leaseUntil > nowText))
      return { result: "deferred" as const };
    const latestAttempt = Math.max(
      Date.parse(plan.lastAttemptAt ?? "") || 0,
      Date.parse(plan.lastDeliveryAt ?? "") || 0,
    );
    if (!plan.pending && latestAttempt + MIN_EMAIL_INTERVAL > now.getTime()) {
      transaction.update(reference, {
        nextRunAt: new Date(latestAttempt + MIN_EMAIL_INTERVAL).toISOString(),
      });
      return { result: "deferred" as const };
    }
    if (!options.forceDigest && plan.nextRunAt > nowText)
      return { result: "deferred" as const };
    let pending = plan.pending;
    if (
      pending &&
      (pending.attempts >= 4 ||
        now.getTime() - Date.parse(pending.createdAt) > 12 * HOUR)
    ) {
      transaction.update(reference, {
        enabled: false,
        lastError:
          "Email delivery is paused after repeated trouble. Review and save your plan to try again.",
        pending: FieldValue.delete(),
        leaseUntil: FieldValue.delete(),
      });
      return { result: "paused" as const };
    }
    const unsubscribe = new URL(options.unsubscribeBaseUrl);
    unsubscribe.searchParams.set("uid", uid);
    unsubscribe.searchParams.set("token", plan.unsubscribeToken);
    if (!pending) {
      const reminderItems = plan.bookmarks.filter(
        (bookmark) =>
          bookmark.reminderAt &&
          bookmark.reminderAt <= nowText &&
          plan.sentReminderAt[bookmark.id] !== bookmark.reminderAt,
      );
      const digestDue = plan.nextDigestAt <= nowText;
      const sendDigest = options.forceDigest || digestDue;
      const items = sendDigest ? plan.bookmarks : reminderItems;
      if (!items.length) {
        transaction.update(reference, {
          nextRunAt: nextEmailRun(
            plan.nextDigestAt,
            plan.bookmarks,
            plan.sentReminderAt,
          ),
        });
        return { result: "deferred" as const };
      }
      pending = {
        id: randomUUID(),
        createdAt: nowText,
        attempts: 0,
        from: options.from,
        unsubscribeUrl: unsubscribe.href,
        message: renderEmailBrief(items, {
          includeSummaries: plan.includeSummaries,
          kind: sendDigest ? "digest" : "reminders",
          workspaceUrl: options.workspaceUrl,
          unsubscribeUrl: unsubscribe.href,
        }),
        advanceDigest: digestDue,
        reminded: Object.fromEntries(
          reminderItems.map((bookmark) => [bookmark.id, bookmark.reminderAt!]),
        ),
      };
    }
    pending = { ...pending, attempts: pending.attempts + 1 };
    const leaseUntil = new Date(now.getTime() + 10 * 60_000).toISOString();
    transaction.update(reference, {
      pending,
      leaseUntil,
      lastAttemptAt: nowText,
      nextRunAt: leaseUntil,
      lastError: FieldValue.delete(),
    });
    return {
      result: undefined,
      revision: plan.revision,
      email: plan.email,
      pending,
      unsubscribeUrl: pending.unsubscribeUrl,
    };
  });
  if (claim.result) return claim.result;
  const { pending, revision, email, unsubscribeUrl } = claim;
  // A changed or deleted plan cancels a queued request before the transport is called.
  const current = (await reference.get()).data() as StoredEmailPlan | undefined;
  if (
    !current?.enabled ||
    current.revision !== revision ||
    current.pending?.id !== pending.id
  )
    return "deferred";
  try {
    const receipt = await transport({
      to: email,
      from: pending.from,
      message: pending.message,
      idempotencyKey: "tab-brain/" + uid + "/" + pending.id,
      unsubscribeUrl,
    });
    const sentAt = clock();
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const latest = snapshot.data() as StoredEmailPlan | undefined;
      if (!latest) return;
      if (latest.revision !== revision || latest.pending?.id !== pending.id) {
        // Preserve the hourly limit even if the owner updates the plan during delivery.
        transaction.update(reference, {
          lastDeliveryAt: sentAt.toISOString(),
          nextRunAt:
            latest.nextRunAt >
            new Date(sentAt.getTime() + MIN_EMAIL_INTERVAL).toISOString()
              ? latest.nextRunAt
              : new Date(sentAt.getTime() + MIN_EMAIL_INTERVAL).toISOString(),
        });
        return;
      }
      const sentReminderAt = { ...latest.sentReminderAt, ...pending.reminded };
      const nextDigest = pending.advanceDigest
        ? nextDigestAt(latest, sentAt)
        : latest.nextDigestAt;
      const nextRun = nextEmailRun(
        nextDigest,
        latest.bookmarks,
        sentReminderAt,
      );
      transaction.update(reference, {
        sentReminderAt,
        nextDigestAt: nextDigest,
        nextRunAt: nextRun,
        lastDeliveryAt: sentAt.toISOString(),
        lastDeliveryId: receipt.id,
        pending: FieldValue.delete(),
        leaseUntil: FieldValue.delete(),
        lastError: FieldValue.delete(),
      });
    });
    return "sent";
  } catch (error) {
    const retryable = !(error instanceof DeliveryError) || error.retryable;
    let result: "deferred" | "paused" = "deferred";
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const latest = snapshot.data() as StoredEmailPlan | undefined;
      if (
        !latest ||
        latest.revision !== revision ||
        latest.pending?.id !== pending.id
      )
        return;
      const paused = !retryable || pending.attempts >= 4;
      result = paused ? "paused" : "deferred";
      transaction.update(
        reference,
        paused
          ? {
              enabled: false,
              lastError:
                "Email delivery is paused. Check the sender setup, then review and save your plan.",
              pending: FieldValue.delete(),
              leaseUntil: FieldValue.delete(),
            }
          : {
              nextRunAt: new Date(
                clock().getTime() + 15 * 60_000,
              ).toISOString(),
              leaseUntil: FieldValue.delete(),
              lastError:
                "The email service did not confirm delivery. The same brief will be retried.",
            },
      );
    });
    return result;
  }
}
