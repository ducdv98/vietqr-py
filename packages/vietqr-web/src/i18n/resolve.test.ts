import { describe, expect, it } from "vitest";
import { resolveLocale } from "./resolve";

const base = { locales: ["vi", "en"] as const, defaultLocale: "vi" as const };

describe("resolveLocale", () => {
  it("prefers a valid cookie", () => {
    expect(resolveLocale({ ...base, cookie: "en", acceptLanguage: "vi" })).toBe(
      "en",
    );
  });
  it("ignores a cookie for a disabled locale", () => {
    expect(resolveLocale({ ...base, locales: ["vi"], cookie: "en" })).toBe(
      "vi",
    );
  });
  it("falls back to the best Accept-Language match", () => {
    expect(
      resolveLocale({
        ...base,
        acceptLanguage: "fr;q=0.9, en-US;q=0.8, vi;q=0.1",
      }),
    ).toBe("en");
  });
  it("falls back to the default", () => {
    expect(resolveLocale({ ...base, acceptLanguage: "fr" })).toBe("vi");
  });
});
