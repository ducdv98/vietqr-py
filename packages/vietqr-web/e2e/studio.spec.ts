import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Runs against the REAL vietqr-api (see playwright.config.ts).

const fill = async (page: Page) => {
  // Retry: typing before hydration finishes is lost.
  await expect(async () => {
    await page.getByRole("combobox", { name: "Bank" }).fill("vietcom");
    await page
      .getByRole("option", { name: /^Vietcombank/ })
      .click({ timeout: 1000 });
  }).toPass();
  await page.getByLabel("Account number").fill("0123456789");
  await page.getByLabel("Amount (VND)").fill("50000");
  await page.getByLabel("Description").fill("Lunch");
};

const payloadText = (page: Page) => page.getByTestId("payload");

test("dynamic QR: preview shows the Payload with the amount and bank", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Preview" }).getByRole("status"),
  ).toContainText("Fill in the form");
  await fill(page);
  const payload = payloadText(page);
  await expect(payload).toBeVisible();
  const text = (await payload.textContent())!;
  expect(text).toMatch(/^000201/);
  expect(text).toContain("970436"); // Vietcombank BIN
  expect(text).toContain("0123456789");
  expect(text).toContain("540550000"); // tag 54: amount 50000
  expect(text).toContain("Lunch");
  await expect(
    page.getByRole("img", { name: "Generated VietQR card" }),
  ).toBeVisible();
  expect(text).toContain("010212"); // tag 01 = 12: dynamic
  await expect(page.getByTestId("qr-type")).toContainText("QR type: Dynamic");
});

test("static QR: no amount and no description still previews, as QR type static", async ({
  page,
}) => {
  await page.goto("/");
  await expect(async () => {
    await page.getByRole("combobox", { name: "Bank" }).fill("vietcom");
    await page
      .getByRole("option", { name: /^Vietcombank/ })
      .click({ timeout: 1000 });
  }).toPass();
  await page.getByLabel("Account number").fill("0123456789");
  const payload = payloadText(page);
  await expect(payload).toBeVisible();
  const text = (await payload.textContent())!;
  expect(text).toContain("010211"); // tag 01 = 11: static
  expect(text).toContain("5303704" + "5802VN"); // currency then country: no tag 54 (amount) between
  await expect(page.getByTestId("qr-type")).toContainText("QR type: Static");
  await expect(
    page.getByRole("img", { name: "Generated VietQR card" }),
  ).toBeVisible();
  await expect(page.getByLabel("Amount (VND)")).toHaveValue("");
  // Embed URL carries no amount.
  await expect(
    page.getByRole("link", { name: "Download PNG" }),
  ).not.toHaveAttribute("href", /amount=/);
});

test("query string prefills the form and renders immediately", async ({
  page,
}) => {
  await page.goto(
    "/?bank=MB&account=999&amount=1000&description=Coffee&template=qr_only&service=card&bill=B1&size=300&name=An",
  );
  await expect(page.getByLabel("Account number")).toHaveValue("999");
  await expect(page.getByLabel("Amount (VND)")).toHaveValue("1000");
  await expect(page.getByRole("radio", { name: "QR only" })).toBeChecked();
  await page.getByText("Advanced options").click();
  await expect(page.getByLabel("Service type")).toHaveValue("card");
  await expect(page.getByLabel("Bill number")).toHaveValue("B1");
  await expect(page.getByLabel("Size (pixels)")).toHaveValue("300");
  await expect(page.getByLabel("Account name")).toHaveValue("An");
  await expect(payloadText(page)).toContainText("970422"); // MB BIN
});

test("all three Templates render and change the image", async ({ page }) => {
  await page.goto("/?bank=VCB&account=0123&amount=50000&description=Lunch");
  await expect(payloadText(page)).toBeVisible();
  const img = page.getByRole("img", { name: "Generated VietQR card" });
  const sources = new Set<string>();
  for (const name of ["Compact card", "Print sheet", "QR only"]) {
    await page.getByRole("radio", { name }).check();
    await expect(page.getByRole("radio", { name })).toBeChecked();
    await expect
      .poll(async () => {
        const src = (await img.getAttribute("src")) ?? "";
        return src.startsWith("data:image/png") && !sources.has(src);
      })
      .toBe(true);
    sources.add((await img.getAttribute("src"))!);
  }
  expect(sources.size).toBe(3);
});

test("download returns the PNG for the current form", async ({ page }) => {
  await page.goto("/?bank=VCB&account=0123&amount=50000&description=Lunch");
  const link = page.getByRole("link", { name: "Download PNG" });
  await expect(link).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await link.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("vietqr-970436-0123.png");
});

test("client-side validation blocks bad input before any API call", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/generate")) calls.push(r.url());
  });
  await page.goto("/");
  await page.getByLabel("Amount (VND)").fill("12.5");
  await page.getByLabel("Description").focus();
  await expect(page.getByText("Use digits only.")).toBeVisible();
  await page.getByLabel("Account number").focus();
  await page.getByLabel("Description").focus();
  await page.getByLabel("Account number").focus();
  await expect(page.getByText("This field is required.").first()).toBeVisible();
  await page.waitForTimeout(700);
  expect(calls).toEqual([]);
});

test("API errors are localized", async ({ page }) => {
  await page.route("**/vietqr-core/generate**", (route) =>
    route.fulfill({
      status: 400,
      headers: { "x-correlation-id": "abc-123" },
      json: { code: "02", desc: "Invalid amount", data: null },
    }),
  );
  await page.goto("/?bank=VCB&account=0123&amount=50000&description=Lunch");
  await expect(
    page.getByRole("region", { name: "Preview" }).getByRole("alert"),
  ).toContainText("The amount is not valid");
});

for (const scheme of ["light", "dark"] as const) {
  test(`studio has no axe violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/?bank=VCB&account=0123&amount=50000&description=Lunch");
    await expect(payloadText(page)).toBeVisible();
    await page.getByText("Advanced options").click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
