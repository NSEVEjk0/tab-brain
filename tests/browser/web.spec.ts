import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("the authored sample workspace loads, persists, and recalls original details offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith("http://127.0.0.1:4173/")
    )
      external.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await expect(
    page.getByText("A sample of what your memory could look like."),
  ).toBeVisible();
  await expect(page.locator(".stats-privacy")).toContainText("0");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await document.fonts.ready;
  });
  await page.screenshot({
    path: "reports/workspace-desktop.png",
    fullPage: false,
    animations: "disabled",
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page
    .getByRole("textbox", { name: "Search your memories" })
    .fill("find the full offline editing notebook");
  await expect(
    page.getByRole("button", {
      name: "Read Folio: lightweight knowledge management",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".connection-indicator")).toContainText("offline");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("a real pasted capture is saved, searchable, editable, and safe to render", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page.getByRole("button", { name: /^Save a page/ }).click();
  const capture = page.getByRole("dialog");
  await capture.getByLabel("Page title").fill("My private browser notebook");
  await capture
    .getByLabel("Original page URL")
    .fill("https://example.com/private-notes");
  await capture
    .getByLabel("Readable page text")
    .fill(
      'The notebook keeps the cobalt-elephant detail available for full offline editing. This is real pasted text kept on this device. <img src=x onerror="window.__captureXss=true">',
    );
  await capture.getByRole("button", { name: "Save on this device" }).click();
  await expect(capture.getByText("1 page, safely saved.")).toBeVisible();
  await capture.getByRole("button", { name: /Explore your memories/ }).click();
  await page
    .getByRole("textbox", { name: "Search your memories" })
    .fill("cobalt-elephant");
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await expect(page.locator(".analysis-badge")).toHaveText("Saved excerpt");
  await page.reload();
  await page
    .getByRole("textbox", { name: "Search your memories" })
    .fill("cobalt-elephant");
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Read My private browser notebook",
      exact: true,
    })
    .click();
  const detail = page.getByRole("dialog");
  await detail.getByLabel("Topic tags").fill("notebook, offline, research");
  await detail.getByRole("button", { name: "Save changes" }).click();
  await expect(
    detail.getByText("Your notes, tags, and collections are saved."),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Add to favorites" }).click();
  await expect(
    detail.getByRole("button", { name: "A favorite" }),
  ).toBeVisible();
  await detail.getByText("Read the saved page text", { exact: false }).click();
  await expect(detail.locator(".original-text p")).toContainText(
    "window.__captureXss=true",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { __captureXss?: boolean }).__captureXss,
    ),
  ).toBeUndefined();
  await detail.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^Favorites/ })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Read My private browser notebook",
      exact: true,
    }),
  ).toBeVisible();
});

test("collections organize a source and deleting the collection preserves the source", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Collection name").fill("Client work");
  await form
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^All memories/ })
    .click();
  await page
    .getByRole("button", {
      name: "Read A field guide to local-first software",
      exact: true,
    })
    .click();
  const detail = page.getByRole("dialog");
  await detail.getByRole("checkbox", { name: "Client work" }).check();
  await detail.getByRole("button", { name: "Save changes" }).click();
  await expect(
    detail.getByText("Your notes, tags, and collections are saved."),
  ).toBeVisible();
  await detail.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("navigation", { name: "Collections" })
    .getByRole("button", { name: /^Client work/ })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Delete collection Client work" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove collection" })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await expect(
    page.getByRole("button", {
      name: "Read A field guide to local-first software",
      exact: true,
    }),
  ).toBeVisible();
});

test("favorites and archive restore remain consistent across navigation and reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page
    .getByRole("button", {
      name: "Favorite React patterns worth keeping",
      exact: true,
    })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^Favorites/ })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(4);
  const card = page.locator(".memory-card").filter({
    has: page.getByRole("button", {
      name: "Read React patterns worth keeping",
      exact: true,
    }),
  });
  await card
    .getByRole("button", {
      name: "More options for React patterns worth keeping",
    })
    .click();
  await card.getByRole("button", { name: "Move to archive" }).click();
  await expect(page.locator(".memory-card")).toHaveCount(3);
  await page
    .getByRole("navigation", { name: "More navigation" })
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "More options for React patterns worth keeping",
    })
    .click();
  await page.getByRole("button", { name: "Restore to memories" }).click();
  await expect(page.locator(".memory-card")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^All memories/ })
    .click();
  await page.reload();
  await expect(page.locator(".memory-card")).toHaveCount(15);
});

test("cloud review minimizes sources, supports exclusion, and never sends without configuration", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (/googleapis|generativelanguage/.test(request.url()))
      external.push(request.url());
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Ask my tabs" })
    .click();
  await page.getByRole("button", { name: "Compare my research tools" }).click();
  const review = page.getByRole("dialog");
  await expect(review.getByText("4 selected sources")).toBeVisible();
  await expect(
    review.getByRole("button", { name: "Approve & send to Gemini" }),
  ).toBeDisabled();
  await expect(review.getByTestId("live-model-badge")).toHaveAttribute(
    "data-phase",
    "review",
  );
  await expect(review.getByTestId("live-model-badge")).toHaveAttribute(
    "data-inference-location",
    "device",
  );
  await review
    .getByRole("checkbox", { name: /Orbit: a focused research workspace/ })
    .uncheck();
  await expect(review.getByText("3 selected sources")).toBeVisible();
  await review.getByText("See the exact source payload").click();
  const payload = JSON.parse(
    await review.locator(".payload-details pre").innerText(),
  );
  expect(payload.sources).toHaveLength(3);
  expect(
    payload.sources.every(
      (source: Record<string, unknown>) => !("text" in source),
    ),
  ).toBe(true);
  expect(JSON.stringify(payload)).not.toContain(
    "Orbit: a focused research workspace",
  );
  expect(JSON.stringify(payload)).toContain("$39");
  await page.screenshot({
    path: "reports/source-preview-desktop.png",
    animations: "disabled",
  });
  await review.getByRole("button", { name: "Keep it local" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(external).toEqual([]);
  await expect(
    page.locator(".topbar").getByTestId("live-model-badge"),
  ).toHaveAttribute("data-phase", "idle");
});

test("saving a new verification method reloads the SDK and sends only the approved sources", async ({
  page,
}) => {
  const exchanges: { method: string; body: string }[] = [];
  const generation: { body: string; appCheck: string }[] = [];
  const token = "test.app-check.signature";
  await page.addInitScript(() => {
    // Simulate the reCAPTCHA widget. Firebase's App Check and AI Logic SDKs still run.
    Object.assign(window, {
      grecaptcha: {
        enterprise: {
          ready: (run: () => void) => run(),
          render: (_: unknown, options: { callback: () => void }) => {
            options.callback();
            return 0;
          },
          execute: async () => "test-captcha-attestation",
        },
      },
    });
  });
  await page.route(
    "https://content-firebaseappcheck.googleapis.com/**",
    async (route) => {
      exchanges.push({
        method: new URL(route.request().url()).pathname.split(":").at(-1)!,
        body: route.request().postData() ?? "",
      });
      await route.fulfill({ json: { token, ttl: "3600s" } });
    },
  );
  await page.route("https://firebasevertexai.googleapis.com/**", async (route) => {
    generation.push({
      body: route.request().postData() ?? "",
      appCheck:
        (await route.request().headerValue("x-firebase-appcheck")) ?? "",
    });
    await route.fulfill({
      json: {
        candidates: [
          {
            content: {
              role: "model",
              parts: [
                {
                  text: JSON.stringify({
                    answer: "The example includes offline editing [1].",
                    unknowns: [],
                  }),
                },
              ],
            },
          },
        ],
      },
    });
  });

  await page.goto("/#settings");
  await page.getByLabel("reCAPTCHA Enterprise site key").fill("TEST_SITE_KEY");
  await page.getByRole("button", { name: "Save connection" }).click();
  const verify = page.getByRole("button", {
    name: "Verify connection",
    exact: true,
  });
  await expect(verify).toBeEnabled();
  expect(exchanges).toEqual([]);
  await verify.click();
  await expect(page.getByText(/^Firebase verified this browser/)).toBeVisible();
  expect(exchanges.map(({ method }) => method)).toEqual([
    "exchangeRecaptchaEnterpriseToken",
  ]);

  await page.getByLabel("App Check verification").selectOption("debug");
  await page
    .getByLabel("App Check development token")
    .fill("TEST_DEVELOPMENT_TOKEN");
  const reloaded = page.waitForEvent("domcontentloaded");
  await page.getByRole("button", { name: "Save connection" }).click();
  await reloaded;
  await expect(page.getByLabel("App Check verification")).toHaveValue("debug");
  await expect(page.getByLabel("App Check development token")).toHaveValue(
    "TEST_DEVELOPMENT_TOKEN",
  );
  await verify.click();
  await expect(page.getByText(/^Firebase verified this browser/)).toBeVisible();
  expect(exchanges.map(({ method }) => method)).toEqual([
    "exchangeRecaptchaEnterpriseToken",
    "exchangeDebugToken",
  ]);
  expect(exchanges[1].body).toContain("TEST_DEVELOPMENT_TOKEN");
  expect(generation).toEqual([]);

  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Ask my tabs" })
    .click();
  await page.getByRole("button", { name: "Compare my research tools" }).click();
  const review = page.getByRole("dialog");
  await review
    .getByRole("checkbox", { name: /Orbit: a focused research workspace/ })
    .uncheck();
  expect(generation).toEqual([]);
  await review.getByRole("button", { name: "Approve & send to Gemini" }).click();
  const answer = page.locator(".answer-card");
  await expect(answer.getByTestId("model-receipt")).toContainText("cloud");
  await expect(
    answer.getByRole("button", { name: /^Open source 1:/ }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await answer.getByRole("button", { name: /^Download brief:/ }).click();
  const brief = await readFile(await (await downloading).path(), "utf8");
  expect(brief).toContain("## Sources");
  expect(brief).toContain("[1]");
  expect(generation).toHaveLength(1);
  expect(generation[0].body).not.toContain(
    "Orbit: a focused research workspace",
  );
  expect(generation[0].appCheck).toBe(token);
  await page.reload();
  await expect(answer.getByTestId("model-receipt")).toBeVisible();
});

test("personal notes, reminders, calendar export, and reading status survive reload", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-20T10:00:00.000Z") });
  await page.goto("/");
  await page.getByRole("button", { name: /^Save a page/ }).click();
  const capture = page.getByRole("dialog");
  await capture.getByLabel("Page title").fill("A page for tomorrow");
  await capture
    .getByLabel("Original page URL")
    .fill("https://example.com/return-visit");
  await capture
    .getByLabel("Readable page text")
    .fill(
      "A useful article about making room for reading. The saved page keeps a practical idea available offline.",
    );
  await capture.getByRole("button", { name: "Save on this device" }).click();
  await capture.getByRole("button", { name: "Explore your memories" }).click();
  await page
    .getByRole("button", { name: "Read A page for tomorrow", exact: true })
    .click();
  const detail = page.getByRole("dialog");
  await detail
    .getByLabel("Your notes")
    .fill("Try the amber-tortoise idea at the next planning meeting.");
  await detail.getByRole("button", { name: "Save changes" }).click();
  await detail.getByLabel("Reminder date and time").fill("2026-11-20T10:01");
  await detail
    .getByRole("button", { name: "Set reminder", exact: true })
    .click();
  await expect(
    detail.getByRole("button", { name: "Update reminder" }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await detail
    .getByRole("button", { name: "Add to calendar", exact: true })
    .click();
  const calendar = await readFile(
    (await (await downloadEvent).path())!,
    "utf8",
  );
  expect(calendar).toContain("DTSTART:20261120T100100Z");
  expect(calendar).toContain("ACTION:DISPLAY");
  await detail.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await page
    .getByRole("textbox", { name: "Search your memories" })
    .fill("amber-tortoise");
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Return visits", exact: true })
    .click();
  await expect(
    page
      .locator(".return-section")
      .filter({ hasText: "Coming up" })
      .getByRole("button", { name: "A page for tomorrow", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(65_000);
  const ready = page.locator(".return-section").first();
  await expect(
    ready.getByRole("button", { name: "A page for tomorrow", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "reports/return-visits-desktop.png",
    animations: "disabled",
  });
  await ready
    .getByRole("button", {
      name: "Mark A page for tomorrow as read",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "A page for tomorrow", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "A page for tomorrow", exact: true }),
  ).toHaveCount(0);
});

test("email briefs can be previewed and downloaded offline without sharing notes or full pages", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (/googleapis|resend\.com/.test(request.url()))
      external.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Save a page/ }).click();
  const capture = page.getByRole("dialog");
  await capture.getByLabel("Page title").fill("My reading brief page");
  await capture
    .getByLabel("Original page URL")
    .fill("https://example.com/brief-page");
  await capture
    .getByLabel("Readable page text")
    .fill(
      "An introduction to a useful reading habit. " +
        "Keep a little time for your saved bookmarks. ".repeat(40) +
        "FULL_PAGE_TAIL_SENTINEL",
    );
  await capture.getByRole("button", { name: "Save on this device" }).click();
  await capture.getByRole("button", { name: "Explore your memories" }).click();
  await page
    .getByRole("button", { name: "Read My reading brief page", exact: true })
    .click();
  const detail = page.getByRole("dialog");
  await detail.getByLabel("Your notes").fill("PRIVATE_EMAIL_NOTE_SENTINEL");
  await detail.getByRole("button", { name: "Save changes" }).click();
  await detail.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("navigation", { name: "More navigation" })
    .getByRole("button", { name: "Settings & backups" })
    .click();
  const emails = page.locator(".email-panel");
  await expect(
    emails.getByText("1 bookmark selected", { exact: true }),
  ).toBeVisible();
  await emails.getByRole("button", { name: "Preview my email brief" }).click();
  await expect(
    emails.getByRole("checkbox", { name: /I approve sharing/ }),
  ).not.toBeChecked();
  await emails.getByText("See the exact bookmark copy").click();
  const payload = JSON.parse(
    await emails.locator(".payload-details pre").innerText(),
  );
  expect(payload.bookmarks).toHaveLength(1);
  expect(payload.bookmarks[0].title).toBe("My reading brief page");
  expect("text" in payload.bookmarks[0]).toBe(false);
  expect("notes" in payload.bookmarks[0]).toBe(false);
  expect(JSON.stringify(payload)).not.toContain("PRIVATE_EMAIL_NOTE_SENTINEL");
  expect(JSON.stringify(payload)).not.toContain("FULL_PAGE_TAIL_SENTINEL");
  await expect(
    emails.getByRole("button", { name: "Turn on email briefs" }),
  ).toBeDisabled();
  await page.screenshot({
    path: "reports/email-preview-desktop.png",
    animations: "disabled",
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await emails.getByRole("button", { name: "Preview my email brief" }).click();
  const downloadEvent = page.waitForEvent("download");
  await emails.getByRole("button", { name: "Download this brief" }).click();
  const html = await readFile((await (await downloadEvent).path())!, "utf8");
  expect(html).toContain("My reading brief page");
  expect(html).not.toContain("PRIVATE_EMAIL_NOTE_SENTINEL");
  expect(html).not.toContain("FULL_PAGE_TAIL_SENTINEL");
  expect(external).toEqual([]);
});

test("hash navigation and browser back return to the correct workspace view", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".ask-nav").click();
  await expect(
    page.getByRole("heading", { name: "Let your tabs talk to each other." }),
  ).toBeVisible();
  await page.goto("/#settings");
  await expect(
    page.getByRole("heading", { name: "Your space, your rules." }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Let your tabs talk to each other." }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Collections" })
    .getByRole("button", { name: /^Product research/ })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(5);
  await page.reload();
  await expect(page.locator(".memory-card")).toHaveCount(5);
});

test("backups exclude AI settings and reject invalid imported sources without changing the library", async ({
  page,
}) => {
  await page.goto("/#settings");
  await page.getByLabel("Firebase Web app configuration").fill(
    JSON.stringify({
      apiKey: "TEST_NOT_A_REAL_KEY",
      projectId: "test-project",
      appId: "TEST_NOT_A_REAL_APP",
    }),
  );
  await page.getByLabel("App Check verification").selectOption("debug");
  await page
    .getByLabel("App Check development token")
    .fill("TEST_NOT_A_REAL_TOKEN");
  await page.getByRole("button", { name: "Save connection" }).click();
  await expect(
    page.getByText("Configuration saved", { exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await expect(
    page.getByRole("button", { name: "Verify connection", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const download = await downloadPromise;
  const raw = await readFile((await download.path())!, "utf8");
  const backup = JSON.parse(raw);
  expect(backup.memories).toHaveLength(15);
  expect(raw).not.toContain("TEST_NOT_A_REAL_KEY");
  expect(raw).not.toContain("TEST_NOT_A_REAL_TOKEN");
  expect(raw).not.toContain("tabId");
  backup.memories[0].url = "javascript:alert(1)";
  await page.getByLabel("Import Tab Brain backup").setInputFiles({
    name: "invalid-source.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole("alert")).toContainText("http");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^All memories/ })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(15);
});

test("grid, list, and topic controls remain functional and topic filters find matching memories", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Topic view" }).click();
  await page
    .locator(".full-topic-card")
    .getByRole("button", { name: /Filter research,/ })
    .click();
  await expect(page.locator(".active-filter")).toContainText("#research");
  expect(await page.locator(".memory-card").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Clear tag filter" }).click();
  await expect(page.locator(".memory-card")).toHaveCount(15);
});

test("denied browser storage produces a clear failure and no false save receipt", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("Storage is denied", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByText("We couldn’t open local storage.")).toBeVisible();
  await expect(page.locator(".memory-card")).toHaveCount(0);
  await page.getByRole("button", { name: /^Save a page/ }).click();
  const capture = page.getByRole("dialog");
  await capture.getByLabel("Page title").fill("Denied save");
  await capture
    .getByLabel("Original page URL")
    .fill("https://example.com/denied");
  await capture
    .getByLabel("Readable page text")
    .fill(
      "This page has plenty of readable text, but browser storage is deliberately unavailable.",
    );
  await capture.getByRole("button", { name: "Save on this device" }).click();
  await expect(capture.getByRole("alert")).toBeVisible();
  await expect(
    capture.getByRole("button", { name: "Explore your memories" }),
  ).toHaveCount(0);
});
