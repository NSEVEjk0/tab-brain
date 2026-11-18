export const PUBLIC_SITE = "https://tab-brain-memory.vercel.app";
export const isExtension =
  typeof chrome !== "undefined" &&
  Boolean(chrome.runtime?.id) &&
  location.protocol === "chrome-extension:";
export const publicSite = isExtension ? PUBLIC_SITE : location.origin;
export const APP_CHECK_SESSION_KEY = "tab-brain-appcheck-token";
