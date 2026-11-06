import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3101";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "theme-persistence.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3101",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    env: { ...process.env, NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
