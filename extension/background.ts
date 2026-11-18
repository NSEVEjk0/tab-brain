import { claimDueReminders, snapshot } from "../src/db";
import {
  REMINDER_ALARM_PREFIX,
  syncExtensionReminders,
} from "../src/extensionReminders";

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

async function restoreReminders() {
  const library = await snapshot();
  await syncExtensionReminders(
    library.memories,
    library.settings.reminderNotifications === true,
  );
}
chrome.runtime.onStartup.addListener(() => {
  void restoreReminders();
});
chrome.runtime.onInstalled.addListener(() => {
  void restoreReminders();
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith(REMINDER_ALARM_PREFIX)) return;
  void (async () => {
    const library = await snapshot();
    if (!library.settings.reminderNotifications) return;
    if ((await chrome.notifications.getPermissionLevel()) !== "granted") return;
    const due = await claimDueReminders();
    for (const memory of due)
      await chrome.notifications.create(REMINDER_ALARM_PREFIX + memory.id, {
        type: "basic",
        iconUrl: "icon-128.png",
        title: "A page worth coming back to",
        message: memory.title,
        priority: 1,
      });
    await restoreReminders();
  })().catch(() => undefined);
});
chrome.notifications.onClicked.addListener((id) => {
  if (!id.startsWith(REMINDER_ALARM_PREFIX)) return;
  void chrome.tabs.create({
    url:
      chrome.runtime.getURL("index.html") +
      "#reminders?memory=" +
      encodeURIComponent(id.slice(REMINDER_ALARM_PREFIX.length)),
  });
  void chrome.notifications.clear(id);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "snap-this-page") return;
  void chrome.tabs
    .query({ active: true, currentWindow: true })
    .then(([tab]) => {
      if (!tab?.id) return;
      // Opening is tied to this keyboard interaction. Page text is read by the panel only after confirmation.
      void chrome.sidePanel
        .open({ windowId: tab.windowId })
        .catch(() => undefined);
      void chrome.storage.local.set({
        pendingCapture: {
          nonce: crypto.randomUUID(),
          scope: "current",
          tabId: tab.id,
        },
      });
    });
});
