import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const BANKS = [
  {
    bin: "970436",
    code: "VCB",
    shortName: "Vietcombank",
    name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    logo: "",
  },
  {
    bin: "970422",
    code: "MB",
    shortName: "MBBank",
    name: "Ngân hàng TMCP Quân đội",
    logo: "",
  },
];

// Mock the API at the browser so the spec needs no running vietqr-api.
async function mockBanks(page: Page) {
  await page.route("**/api/v1/vietqr-core/banks**", (route) => {
    const url = new URL(route.request().url());
    const key = decodeURIComponent(url.pathname.split("/").pop()!);
    const one = BANKS.find((b) => b.code === key || b.bin === key);
    const isList = url.pathname.endsWith("/banks");
    return route.fulfill({
      json: {
        code: "00",
        desc: "success",
        data: isList ? BANKS : (one ?? null),
      },
    });
  });
}

const axe = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();

for (const scheme of ["light", "dark"] as const) {
  test(`banks list has no axe violations (${scheme})`, async ({ page }) => {
    await mockBanks(page);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/banks");
    await expect(
      page.getByRole("link", { name: "Vietcombank", exact: true }),
    ).toBeVisible();
    expect((await axe(page)).violations).toEqual([]);
  });

  test(`bank detail has no axe violations (${scheme})`, async ({ page }) => {
    await mockBanks(page);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/banks/VCB");
    await expect(
      page.getByRole("heading", { name: "Vietcombank" }),
    ).toBeVisible();
    expect((await axe(page)).violations).toEqual([]);
  });
}

test("search is diacritic-insensitive and links to Studio", async ({
  page,
}) => {
  await mockBanks(page);
  await page.goto("/banks");
  await page.getByRole("searchbox").fill("quan doi");
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Create QR/ })).toHaveAttribute(
    "href",
    "/?bank=MB",
  );
});
