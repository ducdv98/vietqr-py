import { describe, expect, it } from "vitest";
import { defaultParams, parseParams } from "@/lib/studio/params";
import { resolvePay } from "./resolve";

const banks = [
  { bin: "970436", code: "VCB", shortName: "Vietcombank" },
  { bin: "970422", code: "MB", shortName: "MB Bank" },
];

const link = (qs: string) => parseParams(qs, defaultParams());

describe("resolvePay", () => {
  it("resolves a complete link to a qr_only generate request and its bank", () => {
    const r = resolvePay(
      link("bank=VCB&account=0123456789&amount=50000&description=Lunch"),
      banks,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.bank).toEqual(banks[0]);
    expect(r.request).toMatchObject({
      bankBin: "970436",
      accountNo: "0123456789",
      amount: "50000",
      description: "Lunch",
      template: "qr_only",
    });
  });

  it("matches the bank by BIN or case-insensitive code", () => {
    const r = resolvePay(
      link("bank=970422&account=1&amount=1&description=x"),
      banks,
    );
    expect(r.status === "ok" && r.bank.code).toBe("MB");
  });

  it("reports an empty link as missing", () => {
    expect(resolvePay(link(""), banks)).toEqual({ status: "missing" });
  });

  it("reports field errors for an invalid link", () => {
    const r = resolvePay(
      link("bank=VCB&account=1&amount=abc&description=x"),
      banks,
    );
    expect(r).toEqual({
      status: "invalid",
      errors: { amount: { code: "notDigits" } },
    });
  });

  it("reports an unknown bank as an invalid field", () => {
    const r = resolvePay(
      link("bank=NOPE&account=1&amount=1&description=x"),
      banks,
    );
    expect(r).toEqual({
      status: "invalid",
      errors: { bank: { code: "unknownBank" } },
    });
  });
});
