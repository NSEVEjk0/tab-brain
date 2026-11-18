import type { Memory } from "./types";

export const REMINDER_ALARM_PREFIX = "tab-brain-return:";
export async function syncExtensionReminders(
  memories: Memory[],
  enabled: boolean,
) {
  if (
    typeof chrome === "undefined" ||
    !chrome.runtime?.id ||
    typeof chrome.alarms === "undefined"
  )
    return;
  const pending = enabled
    ? memories.filter(
        (memory) =>
          !memory.archived &&
          !memory.readAt &&
          memory.reminder &&
          Number.isFinite(Date.parse(memory.reminder.at)) &&
          (!memory.reminder.notifiedAt ||
            Date.parse(memory.reminder.notifiedAt) <
              Date.parse(memory.reminder.at)),
      )
    : [];
  const names = new Set(
    pending.map((memory) => REMINDER_ALARM_PREFIX + memory.id),
  );
  const existing = await chrome.alarms.getAll();
  for (const alarm of existing)
    if (alarm.name.startsWith(REMINDER_ALARM_PREFIX) && !names.has(alarm.name))
      await chrome.alarms.clear(alarm.name);
  for (const memory of pending)
    await chrome.alarms.create(REMINDER_ALARM_PREFIX + memory.id, {
      when: Math.max(Date.now() + 1000, Date.parse(memory.reminder!.at)),
    });
}
