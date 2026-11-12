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
});
