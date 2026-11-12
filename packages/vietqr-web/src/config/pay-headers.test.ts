import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { PAY_HEADERS, PAY_SOURCE } from "./pay-headers";

describe("next.config headers", () => {
  it("sends no-referrer and noindex on /pay", async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find((r) => r.source === PAY_SOURCE);
    expect(rule?.headers).toEqual(expect.arrayContaining([...PAY_HEADERS]));
    const map = Object.fromEntries(rule!.headers.map((h) => [h.key, h.value]));
    expect(map["Referrer-Policy"]).toBe("no-referrer");
    expect(map["X-Robots-Tag"]).toMatch(/noindex/);
  });
});
