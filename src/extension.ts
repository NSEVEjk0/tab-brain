import { isExtension } from "./constants";
import { canonicalUrl } from "./library";
import { storedMemory } from "./db";
import type { ExtractedPage, Memory } from "./types";

export interface CaptureTarget {
  id: number;
  title: string;
  url: string;
  windowId: number;
  pinned: boolean;
}
export async function captureTargets(
  scope: "all" | "current",
  tabId?: number,
): Promise<CaptureTarget[]> {
  if (!isExtension) return [];
  const tabs =
    tabId != null
      ? [await chrome.tabs.get(tabId)]
      : await chrome.tabs.query(
          scope === "current"
            ? { active: true, currentWindow: true }
            : { currentWindow: true },
        );
  return tabs
    .filter((tab) => tab.id != null && tab.url && /^https?:\/\//.test(tab.url))
    .map((tab) => ({
      id: tab.id!,
      title: tab.title || "Untitled page",
      url: tab.url!,
      windowId: tab.windowId,
      pinned: Boolean(tab.pinned),
    }));
}
export async function extractTab(
  target: CaptureTarget,
): Promise<ExtractedPage> {
  await chrome.scripting.executeScript({
    target: { tabId: target.id },
    files: ["content.js"],
  });
  const response = await chrome.tabs.sendMessage(target.id, {
    type: "TAB_BRAIN_EXTRACT",
  });
  if (!response?.ok)
    throw new Error(response?.error || "The page could not be read.");
  if (
    typeof response.title !== "string" ||
    typeof response.text !== "string" ||
    typeof response.url !== "string"
  )
    throw new Error("The page returned an invalid capture.");
  // A tab may have navigated while extraction was running. Keep the URL of the extracted document.
  return {
    title: response.title,
    text: response.text,
    url: response.url,
    tabId: target.id,
    windowId: target.windowId,
  };
}
export async function closePersistedTabs(
  memories: Memory[],
): Promise<{ closed: number; skipped: number }> {
  if (!isExtension)
    throw new Error(
      "Closing browser tabs is available in the Chrome extension.",
    );
  let closed = 0,
    skipped = 0;
  for (const memory of memories) {
    if (memory.tabId == null || memory.source !== "tab") {
      skipped++;
      continue;
    }
    const stored = await storedMemory(memory.id);
    if (
      !stored ||
      stored.canonicalUrl !== memory.canonicalUrl ||
      stored.tabId !== memory.tabId
    ) {
      skipped++;
      continue;
    }
    try {
      const tab = await chrome.tabs.get(memory.tabId);
      // Compare the full source URL, not only a canonical URL: a hash navigation can change the view.
      if (
        !tab.url ||
        tab.pinned ||
        tab.windowId !== memory.windowId ||
        tab.url !== memory.url ||
        canonicalUrl(tab.url) !== stored.canonicalUrl
      ) {
        skipped++;
        continue;
      }
      await chrome.tabs.remove(memory.tabId);
      closed++;
    } catch {
      skipped++;
    }
  }
  return { closed, skipped };
}
export async function openSource(url: string) {
  if (isExtension) await chrome.tabs.create({ url });
  else window.open(url, "_blank", "noopener,noreferrer");
}
