import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { validateTestDatabaseIsolation } from "./tests/helpers/test-db";

const { testUrl } = validateTestDatabaseIsolation();
// Keep the test runner and Next.js child process unable to fall back to
// DATABASE_URL. CRM_TEST_MODE makes the application require TEST_DATABASE_URL.
delete process.env.DATABASE_URL;
const e2eBaseUrl = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: e2eBaseUrl,
    reuseExistingServer: false,
    env: {
      ...process.env,
      TEST_DATABASE_URL: testUrl,
      CRM_TEST_MODE: "1",
      // Next.js skips loading .env.local with NODE_ENV=test. The E2E server
      // must never read developer or production database credentials.
      NODE_ENV: "test",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? randomBytes(32).toString("base64url"),
      BETTER_AUTH_URL: e2eBaseUrl,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
