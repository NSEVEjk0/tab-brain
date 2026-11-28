import { expect, test } from "@playwright/test";

test("the mobile workspace, navigation, capture and source review fit a narrow screen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".memory-card")).toHaveCount(15);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "reports/workspace-mobile.png",
    fullPage: false,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.locator(".topbar").getByTestId("live-model-badge"),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Save a page/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Ask my tabs" })
    .click();
  await page.getByRole("button", { name: "Compare my research tools" }).click();
  await expect(
    page.getByRole("dialog").getByText("4 selected sources"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "reports/source-preview-mobile.png",
    animations: "disabled",
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep it local" })
    .click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "More navigation" })
    .getByRole("button", { name: "Settings & backups" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings & backups" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Return visits", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Good ideas deserve a return visit." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "reports/return-visits-mobile.png",
    animations: "disabled",
  });
});
