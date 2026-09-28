import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://localhost:4338",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/mock-core.mjs",
      url: "http://127.0.0.1:4409/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 4338 --ignore-lock",
      url: "http://localhost:4338",
      reuseExistingServer: false,
      env: {
        FRONTEND_HOST: "http://localhost:4338",
        PHP_API_BASE_URL: "http://127.0.0.1:4409",
        INTERNAL_API_KEY: "test-only-secret",
      },
    },
  ],
});
