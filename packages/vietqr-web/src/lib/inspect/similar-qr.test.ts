import { describe, expect, it } from "vitest";
import { createSimilarHref } from "./similar-qr";

describe("createSimilarHref", () => {
  it("prefills bank code, account, amount and description", () => {
    const href = createSimilarHref({
      bankBin: "970436",
      bankInfo: { code: "VCB", bin: "970436" },
      accountNo: "0011004",
      amount: "50000",
      description: "cafe & tra",
    });
    expect(href).toBe(
      "/?bank=VCB&account=0011004&amount=50000&description=cafe+%26+tra",
    );
  });
  it("falls back to the BIN for an unknown bank and omits empty fields", () => {
    expect(
      createSimilarHref({
        bankBin: "999999",
        bankInfo: null,
        accountNo: "123",
        amount: null,
        description: "",
      }),
    ).toBe("/?bank=999999&account=123");
  });
  it("carries the service type and bill number when present", () => {
    expect(
      createSimilarHref({
        bankBin: "970436",
        bankInfo: { code: "VCB", bin: "970436" },
        accountNo: "123",
        serviceType: "card",
        billNumber: "INV-7",
      }),
    ).toBe("/?bank=VCB&account=123&service=card&bill=INV-7");
  });
  it("ignores an unknown service type", () => {
    expect(
      createSimilarHref({
        bankBin: "1",
        accountNo: "2",
        serviceType: "weird",
      }),
    ).toBe("/?bank=1&account=2");
  });
  it("is relative to the configured default Template", () => {
    const params = new URLSearchParams(
      createSimilarHref({ bankBin: "1", accountNo: "2" }, "print").slice(2),
    );
    expect(params.has("template")).toBe(false);
  });
});
