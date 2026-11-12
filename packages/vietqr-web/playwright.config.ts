import { defineConfig } from "@playwright/test";

// Minimal shared config. Later tickets add specs under e2e/ (and, against the real API
// container, set VIETQR_API_URL / E2E_BASE_URL). By default it builds and starts the app.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start --port 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          VIETQR_API_URL: process.env.VIETQR_API_URL ?? "http://localhost:8000",
        },
      },
});
