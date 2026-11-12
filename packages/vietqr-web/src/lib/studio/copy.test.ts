import { describe, expect, it } from "vitest";
import { buildEmbedUrl, buildPayLink } from "./copy";
import { defaultParams, parseParams } from "./params";

describe("buildPayLink", () => {
  const params = {
    ...defaultParams(),
    bank: "VCB",
    account: "0123",
    amount: "50000",
    description: "Lunch & coffee",
  };

  it("builds an absolute /pay link from the Studio params", () => {
    const url = new URL(buildPayLink("https://qr.example.com", params));
    expect(url.origin + url.pathname).toBe("https://qr.example.com/pay");
    expect(url.searchParams.get("bank")).toBe("VCB");
    expect(url.searchParams.get("description")).toBe("Lunch & coffee");
  });

  it("round-trips through parseParams and omits defaults", () => {
    const link = buildPayLink("https://x.test", params);
    expect(link).not.toContain("template=");
    expect(parseParams(new URL(link).searchParams)).toEqual(params);
  });

  it("keeps a template that differs from the configured default", () => {
    const p = { ...params, template: "print" as const };
    expect(buildPayLink("https://x.test", p)).toContain("template=print");
    expect(buildPayLink("https://x.test", p, "print")).not.toContain(
      "template=",
    );
  });
});

describe("buildEmbedUrl", () => {
  it("builds an absolute GET /image URL", () => {
    const url = buildEmbedUrl("https://qr.example.com", {
      bankBin: "970436",
      accountNo: "0123",
      amount: "50000",
      template: "compact",
      serviceType: "account",
      format: "png",
      size: 500,
    });
    expect(url).toMatch(
      /^https:\/\/qr\.example\.com\/api\/v1\/vietqr-core\/image\?bankBin=970436&accountNo=0123/,
    );
  });
});
