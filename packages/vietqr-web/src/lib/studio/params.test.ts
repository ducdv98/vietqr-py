import { describe, expect, it } from "vitest";
import {
  PARAM_KEYS,
  defaultParams,
  parseParams,
  serializeParams,
} from "./params";

describe("parseParams", () => {
  it("returns the defaults for an empty query", () => {
    expect(parseParams("")).toEqual(defaultParams());
  });

  it("reads every field from a query string, with or without '?'", () => {
    const qs =
      "bank=VCB&account=0123&amount=50000&description=Hi&template=print&service=card&bill=B1&size=300&name=An";
    const expected = {
      bank: "VCB",
      account: "0123",
      amount: "50000",
      description: "Hi",
      template: "print",
      serviceType: "card",
      billNumber: "B1",
      size: "300",
      accountName: "An",
    };
    expect(parseParams(qs)).toEqual(expected);
    expect(parseParams(`?${qs}`)).toEqual(expected);
    expect(parseParams(new URLSearchParams(qs))).toEqual(expected);
  });

  it("accepts a Next.js searchParams record, taking the first of repeats", () => {
    expect(
      parseParams({ bank: ["MB", "VCB"], amount: "1", other: "x" }),
    ).toMatchObject({ bank: "MB", amount: "1" });
  });

  it("falls back to the default template when unknown, and is case-insensitive", () => {
    expect(parseParams("template=bogus").template).toBe("compact");
    expect(parseParams("template=QR_ONLY").template).toBe("qr_only");
    expect(parseParams("template=bogus", defaultParams("print")).template).toBe(
      "print",
    );
  });

  it("treats unknown service types as account", () => {
    expect(parseParams("service=whatever").serviceType).toBe("account");
    expect(parseParams("service=CARD").serviceType).toBe("card");
  });
});

describe("serializeParams", () => {
  it("omits empty values and defaults", () => {
    expect(serializeParams(defaultParams()).toString()).toBe("");
    expect(
      serializeParams({
        ...defaultParams(),
        bank: "VCB",
        amount: "5",
      }).toString(),
    ).toBe("bank=VCB&amount=5");
  });

  it("omits a template equal to the given default only", () => {
    const p = { ...defaultParams(), template: "print" as const };
    expect(serializeParams(p).toString()).toBe("template=print");
    expect(serializeParams(p, defaultParams("print")).toString()).toBe("");
  });

  it("round-trips including unicode and reserved characters", () => {
    const p = {
      ...defaultParams(),
      bank: "VCB",
      account: "012 3",
      amount: "100000",
      description: "Cà phê & bánh = 50%",
      template: "qr_only" as const,
      serviceType: "card" as const,
      billNumber: "INV#1",
      size: "256",
      accountName: "NGUYEN VAN A",
    };
    expect(parseParams(serializeParams(p))).toEqual(p);
  });

  it("uses the documented parameter names", () => {
    expect(PARAM_KEYS).toEqual({
      bank: "bank",
      account: "account",
      amount: "amount",
      description: "description",
      template: "template",
      serviceType: "service",
      billNumber: "bill",
      size: "size",
      accountName: "name",
    });
  });
});
