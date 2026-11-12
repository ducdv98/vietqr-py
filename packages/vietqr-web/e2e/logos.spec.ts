import { expect, test, type Page } from "@playwright/test";
import { PAY_URL } from "../playwright.config";

// Runs against the REAL vietqr-api: bank logos must be first-party (ADR 0003), so the browser
// may only ever talk to the app's own origin.

function trackExternal(page: Page, origin: string) {
  const external: string[] = [];
  const logos: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol === "data:" || url.protocol === "blob:") return;
    if (url.origin !== origin) external.push(req.url());
    if (url.pathname.startsWith("/api/logos/")) logos.push(url.pathname);
  });
  return { external, logos };
}

test("banks page requests no external host and loads logos from /api/logos", async ({
  page,
  baseURL,
}) => {
  const seen = trackExternal(page, new URL(baseURL!).origin);
  await page.goto("/banks");
  await expect(
    page.getByRole("link", { name: "Vietcombank", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(seen.logos.length).toBeGreaterThan(0);
  expect(seen.external).toEqual([]);
});

test("the logo route answers 404 for an unknown code and never takes a URL", async ({
  request,
}) => {
  expect((await request.get("/api/logos/NOPE")).status()).toBe(404);
  const res = await request.get(
    "/api/logos/" + encodeURIComponent("https://evil.example/x.png"),
  );
  expect(res.status()).toBe(404);
});

test("the logo route serves an image same-origin with long cache headers", async ({
  request,
}) => {
  const res = await request.get("/api/logos/VCB");
  // 502 only when the sandbox has no outbound network to the logo host.
  test.skip(res.status() === 502, "logo host unreachable from this machine");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^image\//);
  expect(res.headers()["cache-control"]).toContain("max-age=");
});

test.describe("pay enabled", () => {
  test.use({ baseURL: PAY_URL });

  test("pay page requests no external host", async ({ page }) => {
    const seen = trackExternal(page, new URL(PAY_URL).origin);
    await page.goto(
      "/pay?bank=VCB&account=0123456789&amount=50000&description=Lunch",
    );
    await expect(page.getByTestId("pay-bank")).toHaveText(/Vietcombank/);
    await page.waitForLoadState("networkidle");
    expect(seen.logos.length).toBeGreaterThan(0);
    expect(seen.external).toEqual([]);
  });
});
