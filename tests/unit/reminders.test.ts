import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { memory } from "./fixtures";
import {
  createMemory,
  parseBackup,
  previewCloud,
  rankMemories,
  serializeBackup,
} from "../../src/library";
import {
  needsNotification,
  reminderCalendar,
  reminderFromInput,
  returnQueue,
} from "../../src/reminders";

describe("return visits and private notes", () => {
  const now = Date.parse("2026-11-18T10:00:00.000Z");
  it("keeps unread due pages in the queue after notification and excludes read or archived pages", () => {
    const due = memory({
      reminder: {
        at: "2026-11-18T09:59:00.000Z",
        notifiedAt: "2026-11-18T10:00:00.000Z",
      },
    });
    const upcoming = memory({
      id: "later",
      reminder: { at: "2026-11-18T11:00:00.000Z" },
    });
    const queue = returnQueue(
      [
        due,
        upcoming,
        memory({ id: "read", readAt: "2026-11-18T09:00:00.000Z" }),
        memory({ id: "archive", archived: true }),
        memory({ id: "unread" }),
      ],
      now,
    );
    expect(queue.due.map((item) => item.id)).toEqual(["m-1"]);
    expect(queue.upcoming.map((item) => item.id)).toEqual(["later"]);
    expect(queue.unread.map((item) => item.id)).toEqual(["unread"]);
    expect(needsNotification(due, now)).toBe(false);
    expect(
      needsNotification(
        { ...due, reminder: { at: "2026-11-18T09:58:00.000Z" } },
        now,
      ),
    ).toBe(true);
  });
  it("rejects past or invalid reminders while retaining a chosen future instant", () => {
    expect(() => reminderFromInput("2026-11-18T09:00:00Z", now)).toThrow(
      "future",
    );
    expect(() => reminderFromInput("not a date", now)).toThrow("date and time");
    expect(() => reminderFromInput("2028-11-18T09:00:00Z", now)).toThrow(
      "next year",
    );
    expect(reminderFromInput("2026-11-18T12:00:00+01:00", now).at).toBe(
      "2026-11-18T11:00:00.000Z",
    );
  });
  it("preserves notes, reading status, and reminders when a page is captured again", () => {
    const original = memory({
      notes: "PRIVATE_NOTE_CERULEAN",
      readAt: "2026-11-18T08:00:00.000Z",
      reminder: { at: "2026-11-19T10:00:00.000Z" },
    });
    const captured = createMemory(
      {
        title: original.title,
        url: original.url,
        text: original.text + " A newly captured fact.",
      },
      original,
    );
    expect(captured.notes).toBe(original.notes);
    expect(captured.readAt).toBe(original.readAt);
    expect(captured.reminder).toEqual(original.reminder);
    expect(rankMemories([captured], "CERULEAN")[0].id).toBe(original.id);
    expect(previewCloud("CERULEAN", [captured]).requestText).not.toContain(
      "PRIVATE_NOTE_CERULEAN",
    );
  });
  it("backs up personal fields without trusting imported model receipts", () => {
    const original = memory({
      notes: "My reading notes",
      readAt: "2026-11-18T08:00:00.000Z",
      reminder: { at: "2026-11-19T10:00:00.000Z" },
      analysis: "on-device",
      modelEvidence: {
        name: "Gemini Nano",
        inferenceSource: "on-device",
        verifiedAt: "2026-11-18T09:00:00.000Z",
      },
    });
    const imported = parseBackup(serializeBackup([original], [])).memories[0];
    expect(imported.notes).toBe(original.notes);
    expect(imported.readAt).toBe(original.readAt);
    expect(imported.reminder?.at).toBe(original.reminder?.at);
    expect(imported.analysis).toBe("imported");
    expect(imported.modelEvidence).toBeUndefined();
  });
  it("exports a calendar alert with UTC times and escapes multiline Unicode titles", () => {
    const calendar = reminderCalendar(
      memory({
        title: "A thought, to revisit;\nBEGIN:VEVENT " + "🌿".repeat(40),
        reminder: { at: "2026-11-19T10:00:00.000Z" },
      }),
      "2026-11-18T10:00:00.000Z",
    );
    expect(calendar).toContain("DTSTART:20261119T100000Z\r\n");
    expect(calendar).toContain("TRIGGER:PT0M");
    expect(calendar.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
    expect(calendar.replace(/\r\n /g, "")).toContain(
      "SUMMARY:Revisit: A thought\\, to revisit\\;\\nBEGIN:VEVENT",
    );
    expect(
      calendar
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).byteLength <= 75),
    ).toBe(true);
  });
});

describe("notification claims across browser windows", () => {
  let db: typeof import("../../src/db");
  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.stubGlobal("indexedDB", new IDBFactory());
    db = await import("../../src/db");
  });
  it("claims a due reminder once across simultaneous callers and claims a later reschedule again", async () => {
    const at = Date.parse("2026-11-18T10:00:00.000Z");
    await db.putMemories([
      memory({ reminder: { at: "2026-11-18T09:59:00.000Z" } }),
    ]);
    const attempts = await Promise.all([
      db.claimDueReminders(at),
      db.claimDueReminders(at),
    ]);
    expect(attempts.flat()).toHaveLength(1);
    expect((await db.storedMemory("m-1"))?.reminder?.notifiedAt).toBe(
      "2026-11-18T10:00:00.000Z",
    );
    await db.putMemories([
      memory({ reminder: { at: "2026-11-18T11:00:00.000Z" } }),
    ]);
    expect(await db.claimDueReminders(at)).toHaveLength(0);
    expect(await db.claimDueReminders(at + 60 * 60_000)).toHaveLength(1);
  });
  it("does not erase AI counters or reconnect an explicitly disconnected project when notifications change", async () => {
    await db.putSettings({
      initialized: true,
      ai: undefined,
      cloudBytes: 20,
      cloudRequests: 1,
    });
    await Promise.all([
      db.recordCloudAttempt(50, 1),
      db.updateSettings({ reminderNotifications: true }),
    ]);
    const state = (await db.snapshot()).settings;
    expect(state.cloudBytes).toBe(70);
    expect(state.cloudRequests).toBe(2);
    expect(state.reminderNotifications).toBe(true);
    expect(state.ai).toBeUndefined();
  });
  it("does not repeat a delivered reminder when an older copy is edited or imported", async () => {
    const original = memory({ reminder: { at: "2026-11-18T09:59:00.000Z" } });
    await db.putMemories([original]);
    await db.claimDueReminders(Date.parse("2026-11-18T10:00:00.000Z"));
    await db.putMemories([
      { ...original, notes: "An edit from another open window." },
    ]);
    expect(
      await db.claimDueReminders(Date.parse("2026-11-18T10:01:00.000Z")),
    ).toHaveLength(0);
    await db.importLibrary([original], []);
    expect(
      await db.claimDueReminders(Date.parse("2026-11-18T10:02:00.000Z")),
    ).toHaveLength(0);
  });
});
