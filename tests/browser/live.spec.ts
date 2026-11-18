import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

test("production serves verified downloads and recalls original saved details offline", async ({
  page,
  context,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page
    .getByRole("textbox", { name: "Search your memories" })
    .fill("full offline editing");
  await expect(
    page.getByRole("button", {
      name: "Read Folio: lightweight knowledge management",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add to Chrome", exact: true })
    .click();
  const link = page.getByRole("link", { name: /Download Chrome extension/ });
  await expect(link).toBeVisible();
  const extension = await request.get((await link.getAttribute("href"))!);
  expect(extension.status()).toBe(200);
  expect((await extension.body()).subarray(0, 2).toString()).toBe("PK");
  const checksumsResponse = await request.get("/downloads/checksums.json");
  expect(checksumsResponse.status()).toBe(200);
  const checksums = await checksumsResponse.json();
  expect(
    createHash("sha256")
      .update(await extension.body())
      .digest("hex"),
  ).toBe(checksums["tab-brain-extension.zip"].sha256);
  const sourceDownload = await request.get("/downloads/tab-brain-source.zip");
  expect(sourceDownload.status()).toBe(200);
  expect((await sourceDownload.body()).subarray(0, 2).toString()).toBe("PK");
  expect(
    createHash("sha256")
      .update(await sourceDownload.body())
      .digest("hex"),
  ).toBe(checksums["tab-brain-source.zip"].sha256);
  const source = await request.get("/samples/folio-notes.html");
  expect(source.status()).toBe(200);
  expect(await source.text()).toContain("synthetic examples");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await document.fonts.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await page.screenshot({
    path: "reports/production-desktop.png",
    animations: "disabled",
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page
    .getByRole("textbox", { name: "Search your memories" })
    .fill("full offline editing");
  await expect(
    page.getByRole("button", {
      name: "Read Folio: lightweight knowledge management",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".connection-indicator")).toContainText("offline");
  expect(errors).toEqual([]);
});

test("production makes AI available without sending sources and respects disconnect after reload", async ({
  page,
}) => {
  const inferenceRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "firebasevertexai.googleapis.com")
      inferenceRequests.push(url.pathname);
  });
  await page.goto("/#settings");
  await expect(
    page.getByText("Configuration saved", { exact: true }),
  ).toBeVisible();
  const config = JSON.parse(
    await page.getByLabel("Firebase Web app configuration").inputValue(),
  );
  expect(config.projectId).toBe("tab-brain");
  await expect(
    page.getByLabel("reCAPTCHA Enterprise site key"),
  ).not.toHaveValue("");
  await page.locator(".ask-nav").click();
  await page
    .getByRole("button", { name: "Compare my research tools", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve & send to Gemini", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Keep it local", exact: true })
    .click();
  expect(inferenceRequests).toEqual([]);

  await page.goto("/#settings");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Setup needed", { exact: true })).toBeVisible();
  await page.locator(".ask-nav").click();
  await page
    .getByRole("button", { name: "Compare my research tools", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Approve & send to Gemini", exact: true }),
  ).toBeDisabled();
  expect(inferenceRequests).toEqual([]);
});
