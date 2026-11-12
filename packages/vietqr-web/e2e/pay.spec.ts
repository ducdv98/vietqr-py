import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PAY_URL } from "../playwright.config";

// Runs against the REAL vietqr-api. The default instance (baseURL) has pay disabled;
// PAY_URL is a second instance of the same build with pay enabled (see playwright.config.ts).

// A Studio-style Pay link (query names from src/lib/studio/params.ts).
const LINK =
  "/pay?bank=VCB&account=0123456789&amount=50000&description=Lunch&name=An";

test("pay is disabled by default: 404", async ({ page }) => {
  const res = await page.goto(LINK);
  expect(res?.status()).toBe(404);
});

test.describe("pay enabled", () => {
  test.use({ baseURL: PAY_URL });
  test.beforeAll(async ({ request }) => {
    await expect
      .poll(async () => (await request.get(PAY_URL + "/")).status(), {
        timeout: 60_000,
      })
      .toBe(200);
  });

  test("renders QR, bank, account, amount and the verify notice from a link", async ({
    page,
  }) => {
    const res = await page.goto(LINK);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("pay-bank")).toHaveText(/Vietcombank/);
    await expect(page.getByText("0123456789")).toBeVisible();
    await expect(page.getByText("₫50,000")).toBeVisible();
    await expect(page.getByText("Lunch")).toBeVisible();
    await expect(page.getByRole("note")).toContainText(
      "Confirm the bank, account number and amount with the recipient",
    );
    const qr = page.getByRole("img", { name: "VietQR code for this payment" });
    await expect(qr).toBeVisible();
    await expect(qr).toHaveAttribute("src", /^data:image\/png/);
  });

  test("a link without an amount shows no amount and tells the payer to enter it", async ({
    page,
  }) => {
    const res = await page.goto("/pay?bank=VCB&account=0123456789&name=An");
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("pay-bank")).toHaveText(/Vietcombank/);
    await expect(page.getByText("0123456789")).toBeVisible();
    await expect(page.getByTestId("pay-no-amount")).toContainText(
      "enter the amount yourself",
    );
    await expect(page.getByText(/₫/)).toHaveCount(0);
    await expect(
      page.getByRole("img", { name: "VietQR code for this payment" }),
    ).toHaveAttribute("src", /^data:image\/png/);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`pay page has no axe violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(LINK);
      await expect(
        page.getByRole("img", { name: "VietQR code for this payment" }),
      ).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("a Pay link copied from Studio opens /pay and shows the QR", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(
      "/?bank=VCB&account=0123456789&amount=50000&description=Lunch",
    );
    await page.getByRole("button", { name: "Copy Pay link" }).click();
    await expect(page.getByText("Pay link copied.")).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(link).pathname).toBe("/pay");

    const res = await page.goto(link);
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("pay-bank")).toHaveText(/Vietcombank/);
    await expect(page.getByText("0123456789")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "VietQR code for this payment" }),
    ).toHaveAttribute("src", /^data:image\/png/);
  });

  test("sends no-referrer and noindex in headers and meta", async ({
    page,
  }) => {
    const res = await page.goto(LINK);
    const h = res!.headers();
    expect(h["referrer-policy"]).toBe("no-referrer");
    expect(h["x-robots-tag"]).toMatch(/noindex/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      "content",
      "no-referrer",
    );
  });

  test("missing params show a friendly error", async ({ page }) => {
    await page.goto("/pay");
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "No payment details",
    );
  });

  test("invalid params show a friendly error and no QR", async ({ page }) => {
    await page.goto("/pay?bank=VCB&account=1&amount=abc&description=x");
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "This payment link is not valid",
    );
    await expect(page.getByRole("img", { name: /VietQR code/ })).toHaveCount(0);
  });

  test.describe("Vietnamese browser", () => {
    test.use({ locale: "vi-VN" });
    test("renders Vietnamese copy", async ({ page }) => {
      await page.goto("/pay");
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "Không có thông tin thanh toán",
      );
    });
  });
});
