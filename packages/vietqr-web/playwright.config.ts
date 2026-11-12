import { defineConfig } from "@playwright/test";

// By default this starts BOTH the real vietqr-api (`uv run vietqr-api` from the repo root,
// with the bundled card assets) and the built web app pointing at it.
//   E2E_API_URL   use an already-running API (e.g. the Docker image) instead of starting one
//   E2E_BASE_URL  use an already-running web app instead of building/starting one
//   E2E_PAY_URL   a second web app instance with the opt-in "pay" page enabled (default: the
//                 built app is also started on port 3101 with VIETQR_ENABLED_PAGES incl. pay;
//                 the main instance on 3100 keeps the default, pay disabled)
const apiPort = process.env.E2E_API_PORT ?? "8765";
/** Base URL of the real API the e2e specs run against (specs may import it). */
export const API_URL = process.env.E2E_API_URL ?? `http://127.0.0.1:${apiPort}`;
const apiURL = API_URL;
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
/** Web app instance with the "pay" page enabled (specs may import it). */
export const PAY_URL = process.env.E2E_PAY_URL ?? "http://localhost:3101";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL },
  webServer: [
    ...(process.env.E2E_API_URL
      ? []
      : [
          {
            command: "uv run vietqr-api",
            cwd: "../..",
            url: `${apiURL}/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: {
              VIETQR_HOST: "127.0.0.1",
              VIETQR_PORT: apiPort,
              VIETQR_ASSETS_DIR: "packages/vietqr-api/assets",
            },
          },
        ]),
    ...(process.env.E2E_BASE_URL
      ? []
      : [
          {
            // One build, two instances: pay is off on 3100 (the default) and on for 3101.
            command:
              "pnpm build && (VIETQR_ENABLED_PAGES=studio,inspect,banks,pay pnpm start --port 3101 & pnpm start --port 3100)",
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
            env: { VIETQR_API_URL: apiURL },
          },
        ]),
  ],
});
