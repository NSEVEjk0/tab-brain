import { chromium, expect, test } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { browserEnvironment, browserExecutable } from "../../playwright.config";

test("the real extension captures fifteen tabs, preserves pinned and changed tabs, and recalls offline", async () => {
  const profile = await mkdtemp(path.join(tmpdir(), "tab-brain-extension-"));
  const extensionPath = path.resolve("extension-dist");
  // The test server has ample /dev/shm; its /tmp may be shared with other builds.
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath: browserExecutable(),
    env: browserEnvironment(),
    ignoreDefaultArgs: ["--disable-dev-shm-usage"],
    viewport: { width: 460, height: 920 },
    args: [
      "--no-sandbox",
      "--renderer-process-limit=4",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    const sourcePaths = [
      "local-first-field-guide",
      "react-patterns",
      "indexeddb-guide",
      "nano-practical-guide",
      "a-quieter-web",
      "canvas-visual-notes",
      "browser-workspace",
      "digital-gardening",
      "folio-notes",
      "notes-outlive-tabs",
      "orbit-research",
      "private-search",
      "relay-team-knowledge",
      "research-to-decision",
      "side-panel",
    ];
    const sources = [];
    for (const name of sourcePaths) {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4173/samples/${name}.html`);
      sources.push(page);
    }
    await worker.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        url: "http://127.0.0.1:4173/samples/local-first-field-guide.html",
      });
      await chrome.tabs.update(tab.id!, { pinned: true });
    });
    const panel = await context.newPage();
    const errors: string[] = [];
    panel.on("pageerror", (error) => errors.push(error.message));
    await panel.goto(`chrome-extension://${id}/index.html`);
    await expect(panel.locator(".memory-card")).toHaveCount(0);
    await panel.getByRole("button", { name: /^Snap all open tabs/ }).click();
    const capture = panel.getByRole("dialog");
    await expect(
      capture.getByText("15 readable tabs in this window"),
    ).toBeVisible();
    await capture
      .getByRole("button", { name: "Snap 15 tabs", exact: true })
      .click();
    await expect(capture.getByText("15 pages, safely saved.")).toBeVisible();
    await sources[1].goto(
      "http://127.0.0.1:4173/samples/react-patterns.html#changed-after-capture",
    );
    await capture
      .getByRole("button", { name: "Close saved tabs", exact: true })
      .click();
    await expect(capture.getByRole("status")).toContainText(
      "13 saved tabs closed",
    );
    expect(sources[0].isClosed()).toBe(false);
    expect(sources[1].isClosed()).toBe(false);
    expect(sources.slice(2).every((page) => page.isClosed())).toBe(true);
    await capture
      .getByRole("button", { name: "Explore your memories" })
      .click();
    await expect(panel.locator(".memory-card")).toHaveCount(15);
    await expect(panel.locator(".analysis-badge").first()).toHaveText(
      "Saved excerpt",
    );
    await panel.screenshot({
      path: "reports/extension-capture.png",
      animations: "disabled",
    });
    await context.setOffline(true);
    await panel.reload();
    await expect(panel.locator(".memory-card")).toHaveCount(15);
    await panel
      .getByRole("textbox", { name: "Search your memories" })
      .fill("transaction completion");
    expect(await panel.locator(".memory-card").count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test("a saved reminder wakes the extension worker after its panel closes", async () => {
  const profile = await mkdtemp(path.join(tmpdir(), "tab-brain-reminders-"));
  const extensionPath = path.resolve("extension-dist");
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath: browserExecutable(),
    env: browserEnvironment(),
    ignoreDefaultArgs: ["--disable-dev-shm-usage"],
    viewport: { width: 460, height: 920 },
    args: [
      "--no-sandbox",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  try {
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).host;
    const source = await context.newPage();
    await source.goto(
      "http://127.0.0.1:4173/samples/local-first-field-guide.html",
    );
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${id}/index.html`);
    await expect(panel.locator(".memory-card")).toHaveCount(0);
    await panel.getByRole("button", { name: /^Snap all open tabs/ }).click();
    await panel
      .getByRole("dialog")
      .getByRole("button", { name: "Snap 1 tab", exact: true })
      .click();
    await panel.getByRole("button", { name: "Explore your memories" }).click();
    await expect(panel.locator(".memory-card")).toHaveCount(1);
    await panel
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await panel
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Return visits", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "Enable notifications", exact: true })
      .click();
    await expect(
      panel.getByRole("button", {
        name: "Turn off notifications",
        exact: true,
      }),
    ).toBeVisible();
    // Advance this test's saved reminder, while letting the real Chrome alarm and worker deliver it.
    const memoryId = await panel.evaluate(
      async () =>
        new Promise<string>((resolve, reject) => {
          const request = indexedDB.open("tab-brain-v1", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const database = request.result;
            const tx = database.transaction("memories", "readwrite");
            const items = tx.objectStore("memories").getAll();
            let id = "";
            items.onsuccess = () => {
              const memory = items.result[0];
              id = memory.id;
              tx.objectStore("memories").put({
                ...memory,
                reminder: { at: new Date(Date.now() + 5000).toISOString() },
              });
            };
            tx.oncomplete = () => {
              database.close();
              resolve(id);
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await panel.reload();
    await expect
      .poll(() =>
        worker.evaluate(
          async (id) =>
            Boolean(await chrome.alarms.get("tab-brain-return:" + id)),
          memoryId,
        ),
      )
      .toBe(true);
    await panel.close();
    await expect
      .poll(
        () =>
          worker.evaluate(
            async (id) =>
              new Promise<string | undefined>((resolve, reject) => {
                const request = indexedDB.open("tab-brain-v1", 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                  const database = request.result;
                  const tx = database.transaction("memories", "readonly");
                  const item = tx.objectStore("memories").get(id);
                  item.onsuccess = () =>
                    resolve(item.result?.reminder?.notifiedAt);
                  tx.oncomplete = () => database.close();
                };
              }),
            memoryId,
          ),
        { timeout: 45_000, intervals: [500, 1000, 2000] },
      )
      .toBeTruthy();
    const notifications = await worker.evaluate(async () =>
      Object.keys(await chrome.notifications.getAll()),
    );
    expect(notifications).toContain("tab-brain-return:" + memoryId);
    expect(
      await worker.evaluate(
        async (id) =>
          Boolean(await chrome.alarms.get("tab-brain-return:" + id)),
        memoryId,
      ),
    ).toBe(false);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
