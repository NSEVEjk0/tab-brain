import type { FirebaseApp } from "firebase/app";
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { APP_CHECK_SESSION_KEY } from "./constants";
import type { AIConfig } from "./types";

let activeVerification: string | undefined;

export function appCheckDebugToken(config: AIConfig) {
  return config.appCheckMode === "debug"
    ? (sessionStorage.getItem(APP_CHECK_SESSION_KEY) ?? "")
    : "";
}

export function saveAppCheckDebugToken(token: string) {
  if (token) sessionStorage.setItem(APP_CHECK_SESSION_KEY, token);
  else sessionStorage.removeItem(APP_CHECK_SESSION_KEY);
}

function verificationKey(config: AIConfig, token: string) {
  const { apiKey, appId, projectId, authDomain } = config.firebase;
  return JSON.stringify([
    apiKey,
    appId,
    projectId,
    authDomain,
    config.appCheckMode,
    config.appCheckMode === "debug" ? token : config.siteKey,
  ]);
}

export function appCheckNeedsReload(config: AIConfig, token: string) {
  return (
    activeVerification !== undefined &&
    activeVerification !== verificationKey(config, token)
  );
}

export function initializeBrowserAppCheck(app: FirebaseApp, config: AIConfig) {
  const token = appCheckDebugToken(config);
  if (config.appCheckMode === "debug" && !token)
    throw new Error(
      "Enter a registered development token in Settings & backups before verifying this browser.",
    );
  if (appCheckNeedsReload(config, token))
    throw new Error("Reload Tab Brain to apply the saved verification settings.");

  const globals = globalThis as typeof globalThis & {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
  };
  // The SDK reads its global debug setting only on the first initialization.
  activeVerification = verificationKey(config, token);
  globals.FIREBASE_APPCHECK_DEBUG_TOKEN = token || false;
  try {
    return initializeAppCheck(app, {
      provider: token
        ? new CustomProvider({
            // In debug mode the SDK exchanges the registered token itself.
            getToken: async () => {
              throw new Error(
                "Reload Tab Brain to apply the saved development token.",
              );
            },
          })
        : new ReCaptchaEnterpriseProvider(config.siteKey),
      isTokenAutoRefreshEnabled: false,
    });
  } finally {
    delete globals.FIREBASE_APPCHECK_DEBUG_TOKEN;
  }
}
