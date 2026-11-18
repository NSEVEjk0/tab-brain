import type { AIConfig, FirebaseConfig } from "./types";

// Web app identifiers and the reCAPTCHA site key are public client configuration.
export const FIREBASE_WEB_CONFIG: Readonly<FirebaseConfig> = {
  apiKey: "AIzaSyBv-GeTks91igZhUteBAU0O-V1l8ax70as",
  authDomain: "tab-brain.firebaseapp.com",
  projectId: "tab-brain",
  storageBucket: "tab-brain.firebasestorage.app",
  messagingSenderId: "941106573002",
  appId: "1:941106573002:web:bc755aa7b8c043ebf98e33",
};
export const DEFAULT_CLOUD_MODEL = "gemini-3.5-flash-lite";
const HOSTED_SITE_KEY = "6Ld5hiYuAAAAAOjvIMyi8k0Rcf6ZG8Vi6avDAIUS";

export function hostedAIConfig(): AIConfig | undefined {
  if (
    typeof location === "undefined" ||
    location.protocol !== "https:" ||
    location.hostname !== "tab-brain-memory.vercel.app"
  )
    return;
  return {
    firebase: { ...FIREBASE_WEB_CONFIG },
    appCheckMode: "enterprise",
    siteKey: HOSTED_SITE_KEY,
    model: DEFAULT_CLOUD_MODEL,
  };
}
