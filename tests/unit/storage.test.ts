import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { memory } from "./fixtures";
import { serializeBackup } from "../../src/library";

let db: typeof import("../../src/db");
beforeEach(async () => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  db = await import("../../src/db");
});
describe("local transaction boundaries", () => {
  it("returns a save receipt only after the record is available in the database", async () => {
    await db.putMemories([memory()]);
    expect((await db.storedMemory("m-1"))?.text).toContain("useful detail");
  });
  it("rolls back an aborted batch and reports that tabs must remain open", async () => {
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      const request = original.apply(this, args);
      queueMicrotask(() => {
        try {
          this.transaction.abort();
        } catch {
          /* already aborted */
        }
      });
      return request;
    });
    await expect(
      db.putMemories([memory(), memory({ id: "m-2" })]),
    ).rejects.toThrow("left open");
    expect((await db.snapshot()).memories).toHaveLength(0);
  });
  it("does not overwrite a newer local edit with an older backup", async () => {
    await db.putMemories([
      memory({
        summary: "A newer local edit.",
        updatedAt: "2026-11-17T09:00:00.000Z",
      }),
    ]);
    await db.importLibrary([memory({ summary: "Older backup." })], []);
    expect((await db.storedMemory("m-1"))?.summary).toBe("A newer local edit.");
  });
  it("removes a collection while keeping its memories", async () => {
    await db.putCollection({
      id: "client",
      name: "Client work",
      color: "#bed8a4",
    });
    await db.putMemories([memory({ collectionIds: ["client"] })]);
    await db.removeCollection("client");
    const state = await db.snapshot();
    expect(state.collections).toHaveLength(0);
    expect(state.memories).toHaveLength(1);
    expect(state.memories[0].collectionIds).toEqual([]);
  });
  it("never exports connection settings or session tokens", async () => {
    await db.putSettings({
      initialized: true,
      cloudBytes: 0,
      cloudRequests: 0,
      ai: {
        firebase: {
          apiKey: "FAKE_CONFIG_SENTINEL",
          appId: "test-app",
          projectId: "test-project",
        },
        siteKey: "FAKE_SITE_KEY_SENTINEL",
        model: "gemini-3.5-flash-lite",
        appCheckMode: "enterprise",
      },
    });
    await db.putMemories([memory()]);
    const state = await db.snapshot();
    const raw = serializeBackup(state.memories, state.collections);
    expect(raw).not.toContain("FAKE_CONFIG_SENTINEL");
    expect(raw).not.toContain("FAKE_SITE_KEY_SENTINEL");
  });
  it("increments approved payload counters atomically across simultaneous requests", async () => {
    await Promise.all([
      db.recordCloudAttempt(120, 1),
      db.recordCloudAttempt(380, 2),
    ]);
    const state = await db.snapshot();
    expect(state.settings.cloudBytes).toBe(500);
    expect(state.settings.cloudRequests).toBe(2);
  });
  it("makes the hosted connection available to new and previously unconfigured libraries", async () => {
    vi.stubGlobal("location", new URL("https://tab-brain-memory.vercel.app"));
    await db.initializeLibrary([memory()], []);
    expect((await db.snapshot()).settings.ai?.firebase.projectId).toBe(
      "tab-brain",
    );
    await db.putSettings({
      initialized: true,
      cloudBytes: 120,
      cloudRequests: 1,
    });
    const state = await db.snapshot();
    expect(state.settings.ai?.appCheckMode).toBe("enterprise");
    expect(state.settings.ai?.siteKey).toBeTruthy();
    expect(state.memories).toHaveLength(1);
    expect(state.settings.cloudBytes).toBe(120);
    expect(state.settings.cloudRequests).toBe(1);
  });
  it("keeps a saved custom project when hosted defaults become available", async () => {
    vi.stubGlobal("location", new URL("https://tab-brain-memory.vercel.app"));
    const custom = {
      firebase: {
        apiKey: "TEST_NOT_A_REAL_KEY",
        appId: "test-app",
        projectId: "custom-project",
      },
      siteKey: "TEST_NOT_A_REAL_SITE_KEY",
      model: "gemini-3.5-flash-lite",
      appCheckMode: "enterprise" as const,
    };
    await db.putSettings({
      initialized: true,
      cloudBytes: 0,
      cloudRequests: 0,
      ai: custom,
    });
    expect((await db.snapshot()).settings.ai).toEqual(custom);
  });
  it("persists the corrected production key without losing saved pages or personal settings", async () => {
    vi.stubGlobal("location", new URL("https://tab-brain-memory.vercel.app"));
    const current = (
      await import("../../src/firebaseConfig")
    ).hostedAIConfig()!;
    await db.putMemories([memory({ notes: "Keep my reading note." })]);
    await db.putSettings({
      initialized: true,
      cloudBytes: 3364,
      cloudRequests: 1,
      reminderNotifications: true,
      ai: {
        ...current,
        siteKey: "6Ld5hiYuAAAAAOjvIMyi8k0Rcf6ZG8Vi6avDAIUS",
        model: "gemini-2.5-flash",
      },
    });
    await db.initializeLibrary([], []);
    vi.resetModules();
    db = await import("../../src/db");
    // Another origin has no managed default, so this also checks the persisted value.
    vi.stubGlobal("location", new URL("https://another-site.example"));
    const state = await db.snapshot();
    expect(state.settings.ai?.siteKey).toBe(
      "6Ld5hiYuAAAAAOjvIMyi8k0Rcf6ZG8Vi6avDAIU8",
    );
    expect(state.settings.ai?.model).toBe("gemini-2.5-flash");
    expect(state.settings.cloudBytes).toBe(3364);
    expect(state.settings.cloudRequests).toBe(1);
    expect(state.settings.reminderNotifications).toBe(true);
    expect(state.memories[0].notes).toBe("Keep my reading note.");
  });
  it("uses the corrected key through later settings and ledger writes while preserving custom keys", async () => {
    vi.stubGlobal("location", new URL("https://tab-brain-memory.vercel.app"));
    const current = (
      await import("../../src/firebaseConfig")
    ).hostedAIConfig()!;
    await db.putSettings({
      initialized: true,
      cloudBytes: 0,
      cloudRequests: 0,
      ai: { ...current, siteKey: "6Ld5hiYuAAAAAOjvIMyi8k0Rcf6ZG8Vi6avDAIUS" },
    });
    await db.updateSettings({ reminderNotifications: true });
    const ledger = await db.recordCloudAttempt(100, 1);
    expect(ledger.ai?.siteKey).toBe(current.siteKey);
    await db.putSettings({
      initialized: true,
      cloudBytes: 0,
      cloudRequests: 0,
      ai: { ...current, siteKey: "TEST_NOT_A_REAL_CUSTOM_KEY" },
    });
    await db.initializeLibrary([], []);
    expect((await db.snapshot()).settings.ai?.siteKey).toBe(
      "TEST_NOT_A_REAL_CUSTOM_KEY",
    );
  });
  it("keeps an explicit disconnect through later settings writes and a reload", async () => {
    vi.stubGlobal("location", new URL("https://tab-brain-memory.vercel.app"));
    await db.initializeLibrary([], []);
    const settings = (await db.snapshot()).settings;
    expect(settings.ai).toBeDefined();
    await db.putSettings({ ...settings, ai: undefined });
    await db.recordCloudAttempt(100, 1);
    vi.resetModules();
    db = await import("../../src/db");
    expect((await db.snapshot()).settings.ai).toBeUndefined();
  });
  it("does not automatically connect local, copied, or extension origins", async () => {
    for (const url of [
      "http://127.0.0.1:4173",
      "https://another-site.example",
      "chrome-extension://test-extension/index.html",
    ]) {
      vi.stubGlobal("location", new URL(url));
      expect((await db.snapshot()).settings.ai).toBeUndefined();
    }
  });
});
