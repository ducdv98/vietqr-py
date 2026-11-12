import { describe, expect, it } from "vitest";
import { ConfigError, parseConfig } from "./parse";

const base = { VIETQR_API_URL: "http://localhost:8000" };

describe("parseConfig", () => {
  it("applies defaults when only the API URL is given", () => {
    const c = parseConfig(base);
    expect(c.apiUrl).toBe("http://localhost:8000");
    expect(c.appName).toBe("VietQR");
    expect(c.appLogo).toBeNull();
    expect(c.locales).toEqual(["vi", "en"]);
    expect(c.defaultLocale).toBe("vi");
    expect(c.defaultTemplate).toBe("compact");
    expect(c.enabledPages).toEqual(["studio", "inspect", "banks"]);
    expect(c.footerLinks).toEqual([]);
  });

  it("keeps the pay page off unless enabled", () => {
    expect(parseConfig(base).enabledPages).not.toContain("pay");
    const c = parseConfig({ ...base, VIETQR_ENABLED_PAGES: "studio, pay" });
    expect(c.enabledPages).toEqual(["studio", "pay"]);
  });

  it("strips trailing slashes from the API URL", () => {
    expect(parseConfig({ VIETQR_API_URL: "http://api:8000//" }).apiUrl).toBe(
      "http://api:8000",
    );
  });

  it("parses locales and uses the first as default unless set", () => {
    const c = parseConfig({ ...base, VIETQR_LOCALES: "en" });
    expect(c.locales).toEqual(["en"]);
    expect(c.defaultLocale).toBe("en");
  });

  it("parses footer links as label|url pairs", () => {
    const c = parseConfig({
      ...base,
      VIETQR_FOOTER_LINKS: "GitHub|https://github.com/x/y; Terms|/terms",
    });
    expect(c.footerLinks).toEqual([
      { label: "GitHub", href: "https://github.com/x/y" },
      { label: "Terms", href: "/terms" },
    ]);
  });

  it("accepts template and logo settings", () => {
    const c = parseConfig({
      ...base,
      VIETQR_DEFAULT_TEMPLATE: "print",
      VIETQR_APP_NAME: "Acme QR",
      VIETQR_APP_LOGO: "/logo.svg",
    });
    expect(c.defaultTemplate).toBe("print");
    expect(c.appName).toBe("Acme QR");
    expect(c.appLogo).toBe("/logo.svg");
  });

  it("fails with a readable message listing every bad variable", () => {
    let error: unknown;
    try {
      parseConfig({
        VIETQR_API_URL: "not a url",
        VIETQR_DEFAULT_TEMPLATE: "fancy",
        VIETQR_ENABLED_PAGES: "studio,nope",
        VIETQR_LOCALES: "fr",
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ConfigError);
    const msg = (error as Error).message;
    expect(msg).toContain("VIETQR_API_URL");
    expect(msg).toContain("VIETQR_DEFAULT_TEMPLATE");
    expect(msg).toContain("VIETQR_ENABLED_PAGES");
    expect(msg).toContain("VIETQR_LOCALES");
  });

  it("requires the API URL", () => {
    expect(() => parseConfig({})).toThrow(/VIETQR_API_URL/);
  });

  it("rejects a default locale outside the enabled locales", () => {
    expect(() =>
      parseConfig({
        ...base,
        VIETQR_LOCALES: "vi",
        VIETQR_DEFAULT_LOCALE: "en",
      }),
    ).toThrow(/VIETQR_DEFAULT_LOCALE/);
  });

  it("rejects malformed footer links", () => {
    expect(() =>
      parseConfig({ ...base, VIETQR_FOOTER_LINKS: "NoUrl" }),
    ).toThrow(/VIETQR_FOOTER_LINKS/);
  });
});
