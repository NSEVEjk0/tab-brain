import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeBrowserAppCheck } from "./appCheck";
import type { AIConfig } from "./types";
import type {
  EmailPlanInput,
  EmailPreferences,
  EmailBookmark,
} from "../shared/email";

export interface SavedEmailPlan extends EmailPreferences {
  enabled: boolean;
  bookmarks: EmailBookmark[];
  nextDigestAt: string;
  nextRunAt: string;
  lastDeliveryAt: string | null;
  lastError: string | null;
}
export type EmailUser = Pick<User, "email" | "emailVerified">;
const clients = new Map<
  string,
  {
    auth: ReturnType<typeof getAuth>;
    functions: ReturnType<typeof getFunctions>;
  }
>();

function client(config: AIConfig) {
  const name = "tab-brain-email-" + config.firebase.appId;
  const saved = clients.get(name);
  if (saved) return saved;
  let app = getApps().find((app) => app.name === name);
  if (!app) {
    app = initializeApp(config.firebase, name);
  }
  initializeBrowserAppCheck(app, config);
  const result = {
    auth: getAuth(app),
    functions: getFunctions(app, "us-central1"),
  };
  clients.set(name, result);
  return result;
}
export async function connectEmail(config: AIConfig): Promise<EmailUser> {
  const { auth } = client(config);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  if (!result.user.emailVerified)
    throw new Error("Choose a Google account with a verified email address.");
  return result.user;
}
export function watchEmailUser(
  config: AIConfig,
  callback: (user: EmailUser | null) => void,
) {
  return onAuthStateChanged(client(config).auth, callback);
}
export async function loadEmailPlan(
  config: AIConfig,
): Promise<SavedEmailPlan | null> {
  return (
    await httpsCallable<undefined, SavedEmailPlan | null>(
      client(config).functions,
      "getEmailPlan",
    )()
  ).data;
}
export async function saveEmailPlan(
  config: AIConfig,
  plan: EmailPlanInput,
): Promise<SavedEmailPlan> {
  return (
    await httpsCallable<EmailPlanInput, SavedEmailPlan>(
      client(config).functions,
      "saveEmailPlan",
    )(plan)
  ).data;
}
export async function stopEmailPlan(config: AIConfig) {
  await httpsCallable(client(config).functions, "deleteEmailPlan")();
}
export async function sendEmailNow(
  config: AIConfig,
): Promise<"sent" | "deferred" | "paused" | "missing"> {
  return (
    await httpsCallable<
      undefined,
      { result: "sent" | "deferred" | "paused" | "missing" }
    >(client(config).functions, "sendEmailBriefNow")()
  ).data.result;
}
export async function signOutEmail(config: AIConfig) {
  await signOut(client(config).auth);
}
export function emailError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /auth\/(operation-not-allowed|configuration-not-found)|functions\/(not-found|internal)|Failed to fetch/i.test(
      message,
    )
  )
    return "Email delivery is not available on this deployment yet. You can still preview and download your reading brief.";
  if (
    /auth\/(popup-blocked|popup-closed-by-user|cancelled-popup-request)/i.test(
      message,
    )
  )
    return "The Google sign-in window did not finish. Try again when you are ready.";
  if (/auth\/unauthorized-domain/i.test(message))
    return "This website needs to be added to Firebase’s authorized sign-in domains.";
  if (/unauthenticated/i.test(message))
    return "Sign in to your email settings before updating the delivery plan.";
  return message.slice(0, 500);
}
