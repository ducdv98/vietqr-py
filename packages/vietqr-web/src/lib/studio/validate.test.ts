import { describe, expect, it } from "vitest";
import { defaultParams, type StudioParams } from "./params";
import { qrTypeOf, toQuery, validateStudio } from "./validate";

const valid: StudioParams = {
  ...defaultParams(),
  bank: "VCB",
  account: " 0123456789 ",
  amount: "50000",
  description: "Lunch",
};

describe("validateStudio", () => {
  it("builds a trimmed API request", () => {
    const r = validateStudio(valid, "970436");
    expect(r).toEqual({
      ok: true,
      request: {
        bankBin: "970436",
        accountNo: "0123456789",
        amount: "50000",
        description: "Lunch",
        template: "compact",
        serviceType: "account",
        format: "png",
        size: 500,
      },
    });
  });

  it("includes optional fields only when filled", () => {
    const r = validateStudio(
      {
        ...valid,
        serviceType: "card",
        billNumber: " B1 ",
        accountName: " An ",
        size: "300",
        template: "qr_only",
      },
      "970436",
    );
    expect(r.ok && r.request).toMatchObject({
      serviceType: "card",
      billNumber: "B1",
      accountName: "An",
      size: 300,
      template: "qr_only",
    });
  });

  it("requires only bank and account", () => {
    const r = validateStudio(defaultParams(), null);
    expect(r).toEqual({
      ok: false,
      errors: {
        bank: { code: "required" },
        account: { code: "required" },
      },
    });
  });

  it("allows an empty amount and description: a static QR", () => {
    const r = validateStudio(
      { ...valid, amount: "  ", description: "" },
      "970436",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.request).not.toHaveProperty("amount");
    expect(r.request).not.toHaveProperty("description");
    expect(toQuery(r.request).has("amount")).toBe(false);
    expect(toQuery(r.request).has("description")).toBe(false);
  });

  it("keeps a description on a static QR", () => {
    const r = validateStudio({ ...valid, amount: "" }, "970436");
    expect(r.ok && r.request.description).toBe("Lunch");
  });

  it("flags a bank that is not in the catalog", () => {
    const r = validateStudio(valid, null);
    expect(!r.ok && r.errors.bank).toEqual({ code: "unknownBank" });
  });

  it.each([
    ["12.5", "notDigits"],
    ["-5", "notDigits"],
    ["1e3", "notDigits"],
    ["0", "notPositive"],
    ["00", "notPositive"],
    ["12345678901234", "tooLong"],
  ])("rejects amount %s as %s", (amount, code) => {
    const r = validateStudio({ ...valid, amount }, "970436");
    expect(!r.ok && r.errors.amount?.code).toBe(code);
  });

  it("accepts a 13-digit amount", () => {
    expect(validateStudio({ ...valid, amount: "9999999999999" }, "1").ok).toBe(
      true,
    );
  });

  it("limits account to 25 and description to 95 characters", () => {
    const a = validateStudio({ ...valid, account: "1".repeat(26) }, "1");
    expect(!a.ok && a.errors.account).toEqual({ code: "tooLong", max: 25 });
    const b = validateStudio({ ...valid, description: "x".repeat(96) }, "1");
    expect(!b.ok && b.errors.description).toEqual({ code: "tooLong", max: 95 });
    expect(
      validateStudio(
        { ...valid, account: "1".repeat(25), description: "x".repeat(95) },
        "1",
      ).ok,
    ).toBe(true);
  });

  it.each(["99", "2001", "abc", "1.5"])("rejects size %s", (size) => {
    const r = validateStudio({ ...valid, size }, "1");
    expect(!r.ok && r.errors.size).toEqual({
      code: "outOfRange",
      min: 100,
      max: 2000,
    });
  });

  it("accepts the size bounds and an empty size (default 500)", () => {
    expect(validateStudio({ ...valid, size: "100" }, "1").ok).toBe(true);
    expect(validateStudio({ ...valid, size: "2000" }, "1").ok).toBe(true);
    const r = validateStudio({ ...valid, size: "" }, "1");
    expect(r.ok && r.request.size).toBe(500);
  });
});

describe("toQuery", () => {
  it("serialises a request with API parameter names, skipping empties", () => {
    const r = validateStudio(valid, "970436");
    if (!r.ok) throw new Error("expected valid");
    expect(toQuery(r.request).toString()).toBe(
      "bankBin=970436&accountNo=0123456789&amount=50000&description=Lunch&template=compact&serviceType=account&format=png&size=500",
    );
  });
});

describe("qrTypeOf", () => {
  it("is dynamic with an amount and static without", () => {
    const dynamic = validateStudio(valid, "970436");
    const fixed = validateStudio({ ...valid, amount: "" }, "970436");
    expect(dynamic.ok && qrTypeOf(dynamic.request)).toBe("dynamic");
    expect(fixed.ok && qrTypeOf(fixed.request)).toBe("static");
  });
});
