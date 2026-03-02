import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
const useWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: isCI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium-local",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "chromium-preview",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: useWebServer
    ? {
        command: process.env.PLAYWRIGHT_WEBSERVER_COMMAND || "npm run start:e2e",
        port: 3000,
        reuseExistingServer: !isCI,
        timeout: 120_000
      }
    : undefined
});
