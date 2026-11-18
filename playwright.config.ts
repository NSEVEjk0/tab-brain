import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export function browserExecutable(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH)
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const cache = path.join(homedir(), ".cache/ms-playwright");
  if (!existsSync(cache)) return undefined;
  const browser = readdirSync(cache)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]))
    .map((name) => path.join(cache, name, "chrome-linux64/chrome"))
    .find(existsSync);
  return browser;
}
export function browserEnvironment() {
  const libraries = path.resolve(".local/browser-libs");
  return existsSync(libraries)
    ? {
        ...process.env,
        LD_LIBRARY_PATH: [libraries, process.env.LD_LIBRARY_PATH]
          .filter(Boolean)
          .join(":"),
      }
    : process.env;
}
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "reports/browser.json" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: browserExecutable(),
      env: browserEnvironment(),
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testMatch: "web.spec.ts" },
    {
      name: "mobile",
      testMatch: "mobile.spec.ts",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "extension", testMatch: "extension.spec.ts", timeout: 75_000 },
    {
      name: "live",
      testMatch: "live.spec.ts",
      use: { baseURL: "https://tab-brain-memory.vercel.app" },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
