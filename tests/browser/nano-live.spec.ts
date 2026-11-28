import { chromium, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

test("official Chrome produces a real Firebase device summary and recalls its original source offline", async () => {
  test.skip(
    process.env.TAB_BRAIN_REAL_NANO !== "1",
    "Opt in on supported Google Chrome hardware.",
  );
  const executable = [
    process.env.TAB_BRAIN_GOOGLE_CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].find((value) => value && existsSync(value));
  expect(
    executable,
    "Install official Google Chrome for this live-model check.",
  ).toBeTruthy();
  const output = path.resolve("reports/nano-proof");
  const profile = path.resolve(".local/nano-proof-profile");
  await mkdir(output, { recursive: true });
  await mkdir(profile, { recursive: true, mode: 0o700 });
  const version = execFileSync(executable!, ["--version"], {
    encoding: "utf8",
  }).trim();
  expect(version).toContain("Google Chrome");
  const report: Record<string, unknown> = {
    checkedAt: new Date().toISOString(),
    browser: version,
    input: "authored test page; no personal data",
    requestedModelVersion: "Gemma 4 for Built-in AI",
    cloudGenerationRequests: [],
  };
  if (existsSync("/proc/meminfo"))
    report.memory = (await readFile("/proc/meminfo", "utf8"))
      .split("\n")
      .filter(
        (line) =>
          line.startsWith("MemTotal:") || line.startsWith("MemAvailable:"),
      );
  const verifyCloud = process.env.TAB_BRAIN_VERIFY_CLOUD === "1";
  const context = await chromium.launchPersistentContext(profile, {
    executablePath: executable,
    headless: !verifyCloud,
    ignoreDefaultArgs: true,
    args: [
      ...(verifyCloud ? [] : ["--headless=new"]),
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "--remote-debugging-pipe",
      "--component-updater=fast-update",
      // These are the switches chrome://flags applies for Gemma 4, plus the CPU backend.
      "--enable-features=AIApiFoundationalModel:model_version/v4,OptimizationGuideManifestBroker,OnDeviceModelForceCpuBackend",
    ],
    viewport: { width: 1440, height: 1000 },
    recordVideo: {
      dir: path.join(output, "video"),
      size: { width: 1280, height: 900 },
    },
  });
  const page = await context.newPage();
  const cloudRequests: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).hostname.includes(
        "firebasevertexai.googleapis.com",
      )
    )
      cloudRequests.push(request.method());
  });
  try {
    await page.goto("chrome://flags/#gemma4-for-built-in-ai");
    await expect(
      page.locator("flags-experiment#gemma4-for-built-in-ai"),
      "This Chrome release must support the Gemma 4 flag.",
    ).toBeAttached();
    await page.goto("http://127.0.0.1:4173/#settings?panel=on-device");
    await expect(
      page.getByRole("button", { name: "Verify connection", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Enable on-device AI", exact: true })
      .click();
    const ready = page.getByText(
      "Gemini Nano is ready to summarize saved pages in this browser.",
      { exact: true },
    );
    await ready.or(page.getByRole("alert")).waitFor({ timeout: 540_000 });
    report.initialization = {
      ready: (await ready.count()) > 0,
      errors: await page.getByRole("alert").allTextContents(),
    };
    expect(await ready.count(), JSON.stringify(report.initialization)).toBe(1);
    await page.getByRole("button", { name: /^All memories/ }).click();
    await page.getByRole("button", { name: /^Save a page/ }).click();
    const dialog = page.getByRole("dialog");
    const title = "Verified local reading source";
    const original =
      "This authored page keeps the cobalt-violet detail available for offline research. A reading library saves original page text and private notes on the reader's device. Pages can be grouped into collections and searched later. Cloud comparisons use separately approved source snippets.";
    await dialog.getByLabel("Page title").fill(title);
    await dialog
      .getByLabel("Original page URL")
      .fill("https://example.com/local-nano-proof");
    await dialog.getByLabel("Readable page text").fill(original);
    await expect(
      dialog.getByRole("checkbox", { name: /Summarize with on-device AI/ }),
    ).toBeChecked();
    await dialog
      .getByRole("button", { name: "Save on this device", exact: true })
      .click();
    await expect(
      dialog.getByText(
        "Local AI summaries and original text are in your memory.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 90_000 });
    await dialog.getByRole("button", { name: /Explore your memories/ }).click();
    await page.getByRole("button", { name: /Settings & backups/ }).click();
    const downloadReady = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export backup", exact: true })
      .click();
    const download = await downloadReady;
    const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
    const saved = backup.memories.find(
      (memory: { title: string }) => memory.title === title,
    );
    expect(saved.analysis).toBe("on-device");
    expect(saved.modelEvidence.inferenceSource).toBe("on-device");
    expect(saved.tags).toHaveLength(3);
    expect(saved.text).toBe(original);
    report.savedResult = {
      summary: saved.summary,
      tags: saved.tags,
      modelEvidence: saved.modelEvidence,
      originalTextRetained: true,
    };
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);
    await page.getByRole("button", { name: /^All memories/ }).click();
    await page.reload();
    await page
      .getByRole("textbox", { name: "Search your memories" })
      .fill("cobalt-violet");
    await expect(page.locator(".memory-card")).toHaveCount(1);
    expect(cloudRequests).toHaveLength(0);
    report.cloudGenerationRequests = cloudRequests;
    report.offlineRecall = true;
    report.devicePassed = true;
    await page.screenshot({ path: path.join(output, "workspace.png") });
    if (verifyCloud) {
      await context.setOffline(false);
      await page.goto("https://tab-brain-memory.vercel.app/#settings");
      await page
        .getByRole("button", { name: "Verify connection", exact: true })
        .click();
      const verified = page.getByText(
        "Firebase verified this browser. You can now approve a cloud question to test the model.",
        { exact: true },
      );
      await verified.or(page.getByRole("alert")).waitFor({ timeout: 60_000 });
      report.browserVerification = {
        success: (await verified.count()) > 0,
        errors: await page.getByRole("alert").allTextContents(),
      };
      expect(
        await verified.count(),
        JSON.stringify(report.browserVerification),
      ).toBe(1);
      await page.locator(".ask-nav").click();
      await page
        .getByRole("button", { name: "Compare my research tools", exact: true })
        .click();
      await expect(page.locator(".review-source")).toHaveCount(4);
      expect(cloudRequests).toHaveLength(0);
      await page
        .getByRole("button", { name: "Approve & send to Gemini", exact: true })
        .click();
      const answer = page.locator(".answer-card").first();
      await answer.or(page.getByRole("alert")).waitFor({ timeout: 90_000 });
      expect(
        await answer.count(),
        JSON.stringify(await page.getByRole("alert").allTextContents()),
      ).toBe(1);
      const citations = await answer.locator(".inline-citation").count();
      expect(citations).toBeGreaterThan(0);
      report.cloud = {
        success: true,
        approvedAuthoredSources: 4,
        citations,
        answer: await answer.innerText(),
      };
      report.cloudGenerationRequests = cloudRequests;
    }
    report.passed = true;
  } finally {
    await page
      .screenshot({ path: path.join(output, verifyCloud ? "last-step.png" : "workspace.png") })
      .catch(() => {});
    await writeFile(
      path.join(output, "result.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    await context.close();
  }
});
