import { beforeEach, describe, expect, it, vi } from "vitest";
import { memory } from "./fixtures";

const stored = vi.hoisted(() => vi.fn());
vi.mock("../../src/db", () => ({ storedMemory: stored }));
let extension: typeof import("../../src/extension");
const get = vi.fn(),
  remove = vi.fn();
beforeEach(async () => {
  vi.resetModules();
  stored.mockReset();
  get.mockReset();
  remove.mockReset();
  vi.stubGlobal("location", {
    protocol: "chrome-extension:",
    origin: "chrome-extension://test",
  });
  vi.stubGlobal("chrome", { runtime: { id: "test" }, tabs: { get, remove } });
  extension = await import("../../src/extension");
});
describe("decluttering without losing work", () => {
  const saved = () => memory({ source: "tab", tabId: 7, windowId: 2 });
  it("leaves a tab open when its local save is missing", async () => {
    stored.mockResolvedValue(undefined);
    expect(await extension.closePersistedTabs([saved()])).toEqual({
      closed: 0,
      skipped: 1,
    });
    expect(remove).not.toHaveBeenCalled();
  });
  it("leaves pinned tabs open", async () => {
    stored.mockResolvedValue(saved());
    get.mockResolvedValue({ url: saved().url, pinned: true, windowId: 2 });
    expect((await extension.closePersistedTabs([saved()])).closed).toBe(0);
    expect(remove).not.toHaveBeenCalled();
  });
  it("leaves a changed fragment open even when the canonical URL still matches", async () => {
    stored.mockResolvedValue(saved());
    get.mockResolvedValue({
      url: saved().url + "#new-section",
      pinned: false,
      windowId: 2,
    });
    expect((await extension.closePersistedTabs([saved()])).skipped).toBe(1);
    expect(remove).not.toHaveBeenCalled();
  });
  it("closes only the unchanged tab whose record was durably saved", async () => {
    stored.mockResolvedValue(saved());
    get.mockResolvedValue({ url: saved().url, pinned: false, windowId: 2 });
    remove.mockResolvedValue(undefined);
    expect(await extension.closePersistedTabs([saved()])).toEqual({
      closed: 1,
      skipped: 0,
    });
    expect(remove).toHaveBeenCalledWith(7);
  });
  it("does not close tabs when reading the save receipt fails", async () => {
    stored.mockRejectedValue(new Error("Storage denied"));
    await expect(extension.closePersistedTabs([saved()])).rejects.toThrow(
      "Storage denied",
    );
    expect(remove).not.toHaveBeenCalled();
  });
});
