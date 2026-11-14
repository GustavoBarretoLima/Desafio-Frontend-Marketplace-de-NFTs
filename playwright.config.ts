import { defineConfig, devices } from "@playwright/test";

import { scenarios } from "./playwright.scenarios";
const channel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./tests",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: scenarios.normal,
    channel,
    trace: "retain-on-failure",
    // The demo uses local mocks. Reject browser traffic to external hosts.
    launchOptions: { args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1", "--no-proxy-server"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: Object.values(scenarios).map((url) => ({
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${new URL(url).port} --strictPort`,
    url,
    reuseExistingServer: false,
    env: {
      VITE_TEST_CACHE_DIR: `node_modules/.vite-playwright-${new URL(url).port}`,
      VITE_E2E_SCENARIOS: "true",
      VITE_MOCK_ORDER_TIMEOUT: String(url === scenarios.orderTimeout),
      VITE_MOCK_NFT_UPDATE: String(url === scenarios.stockUpdate),
      VITE_MOCK_FAVORITES_FAILURE: String(url === scenarios.favoritesFailure),
    },
  })),
});
