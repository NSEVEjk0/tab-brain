import type { Memory, Reminder } from "./types";
import { safeUrl } from "./library";

export function reminderFromInput(input: string, now = Date.now()): Reminder {
  const at = new Date(input).getTime();
  if (!Number.isFinite(at))
    throw new Error("Choose a date and time for your reminder.");
  if (at <= now) throw new Error("Choose a reminder time in the future.");
  if (at > now + 366 * 24 * 60 * 60 * 1000)
    throw new Error("Choose a reminder within the next year.");
  return { at: new Date(at).toISOString() };
}
export function localDateInput(at: string | Date): string {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
export function quickReminder(
  kind: "hour" | "tomorrow" | "week",
  now = new Date(),
): Date {
  const date = new Date(now);
  if (kind === "hour") date.setTime(date.getTime() + 60 * 60_000);
  else {
    date.setDate(date.getDate() + (kind === "week" ? 7 : 1));
    date.setHours(9, 0, 0, 0);
  }
  return date;
}
export function needsNotification(memory: Memory, now = Date.now()): boolean {
  const at = memory.reminder?.at;
  return (
    !memory.archived &&
    !memory.readAt &&
    Boolean(at) &&
    Number.isFinite(Date.parse(at!)) &&
    Date.parse(at!) <= now &&
    (!memory.reminder?.notifiedAt ||
      Date.parse(memory.reminder.notifiedAt) < Date.parse(at!))
  );
}
export function returnQueue(memories: Memory[], now = Date.now()) {
  const scheduled = memories
    .filter(
      (memory) =>
        !memory.archived &&
        !memory.readAt &&
        memory.reminder &&
        Number.isFinite(Date.parse(memory.reminder.at)),
    )
    .sort((a, b) => a.reminder!.at.localeCompare(b.reminder!.at));
  return {
    due: scheduled.filter((memory) => Date.parse(memory.reminder!.at) <= now),
    upcoming: scheduled.filter(
      (memory) => Date.parse(memory.reminder!.at) > now,
    ),
    unread: memories
      .filter(
        (memory) => !memory.archived && !memory.readAt && !memory.reminder,
      )
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
  };
}
export function formatReminder(at: string) {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeCalendar(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}
function calendarDate(value: string) {
  return new Date(value)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}/, "");
}
function foldCalendar(line: string): string {
  const encoder = new TextEncoder();
  let result = "",
    current = "",
    length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      result += current + "\r\n";
      current = " ";
      length = 1;
    }
    current += character;
    length += bytes;
  }
  return result + current;
}
export function reminderCalendar(
  memory: Memory,
  createdAt = new Date().toISOString(),
): string {
  if (!memory.reminder || !Number.isFinite(Date.parse(memory.reminder.at)))
    throw new Error("Set a reminder before adding it to your calendar.");
  const start = memory.reminder.at;
  const end = new Date(Date.parse(start) + 15 * 60_000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tab Brain//Return visits//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeCalendar(memory.id)}@tab-brain`,
    `DTSTAMP:${calendarDate(createdAt)}`,
    `DTSTART:${calendarDate(start)}`,
    `DTEND:${calendarDate(end)}`,
    `SUMMARY:${escapeCalendar("Revisit: " + memory.title)}`,
    `DESCRIPTION:${escapeCalendar("You saved this page in Tab Brain.\n" + safeUrl(memory.url))}`,
    `URL:${safeUrl(memory.url)}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeCalendar("Revisit: " + memory.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldCalendar).join("\r\n") + "\r\n";
}
export function downloadReminder(memory: Memory) {
  const url = URL.createObjectURL(
    new Blob([reminderCalendar(memory)], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "tab-brain-return-visit.ics";
  link.click();
  URL.revokeObjectURL(url);
}

export async function requestReminderPermission(): Promise<void> {
  if (
    typeof chrome !== "undefined" &&
    chrome.runtime?.id &&
    location.protocol === "chrome-extension:"
  ) {
    if ((await chrome.notifications.getPermissionLevel()) !== "granted")
      throw new Error(
        "Chrome notifications are blocked for Tab Brain. Allow them in your browser settings.",
      );
    return;
  }
  if (typeof Notification === "undefined")
    throw new Error(
      "This browser cannot show notifications here. Add a reminder to your calendar instead.",
    );
  if ((await Notification.requestPermission()) !== "granted")
    throw new Error(
      "Notifications were not enabled. Your return visits are still saved, and you can add them to your calendar.",
    );
}
export async function showWebReminder(memory: Memory) {
  const options = {
    body: memory.title,
    icon: "./icon-192.png",
    tag: "tab-brain-reminder-" + memory.id,
    data: { memoryId: memory.id },
  };
  const registration =
    "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration()
      : undefined;
  if (registration)
    await registration.showNotification("A page worth coming back to", options);
  else {
    const notification = new Notification(
      "A page worth coming back to",
      options,
    );
    notification.onclick = () => {
      window.focus();
      location.hash = `reminders?memory=${encodeURIComponent(memory.id)}`;
      notification.close();
    };
  }
}
