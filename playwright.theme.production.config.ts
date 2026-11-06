import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3102";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "theme-persistence.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3102",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      BETTER_AUTH_SECRET: "synthetic-e2e-secret-that-is-not-real",
      DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
    },
  },
});
