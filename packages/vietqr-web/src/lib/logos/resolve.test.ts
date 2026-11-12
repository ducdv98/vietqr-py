import { describe, expect, it } from "vitest";
import {
  allowedHosts,
  findLogoUrl,
  isAllowedLogoUrl,
  parseLogoUrl,
} from "./resolve";

const banks = [
  { code: "VCB", logo: "https://cdn.vietqr.io/img/VCB.png" },
  { code: "MB", logo: "" },
  { code: "EVIL", logo: "http://10.0.0.1/x.png" },
];

describe("findLogoUrl", () => {
  it("resolves by exact bank code only", () => {
    expect(findLogoUrl(banks, "VCB")).toBe("https://cdn.vietqr.io/img/VCB.png");
    expect(findLogoUrl(banks, "vcb")).toBeNull();
    expect(findLogoUrl(banks, "MB")).toBeNull();
    expect(findLogoUrl(banks, "nope")).toBeNull();
  });
});

describe("parseLogoUrl", () => {
  it.each([
    "http://cdn.vietqr.io/a.png",
    "https://localhost/a.png",
    "https://127.0.0.1/a.png",
    "https://[::1]/a.png",
    "https://intranet/a.png",
    "https://user:pw@cdn.vietqr.io/a.png",
    "file:///etc/passwd",
    "not a url",
    "",
  ])("rejects %s", (u) => {
    expect(parseLogoUrl(u)).toBeNull();
  });

  it("accepts a public https URL", () => {
    expect(parseLogoUrl("https://cdn.vietqr.io/a.png")?.hostname).toBe(
      "cdn.vietqr.io",
    );
  });
});

describe("allowedHosts", () => {
  it("derives hosts from valid catalog URLs, skipping unsafe ones", () => {
    expect([...allowedHosts(banks, null)]).toEqual(["cdn.vietqr.io"]);
  });

  it("uses the configured list when set", () => {
    expect([...allowedHosts(banks, ["Img.Example.com"])]).toEqual([
      "img.example.com",
    ]);
  });
});

describe("isAllowedLogoUrl", () => {
  const hosts = new Set(["cdn.vietqr.io"]);
  it("requires https and an allowed host", () => {
    expect(isAllowedLogoUrl("https://cdn.vietqr.io/x.png", hosts)).toBe(true);
    expect(isAllowedLogoUrl("https://other.io/x.png", hosts)).toBe(false);
    expect(isAllowedLogoUrl("http://cdn.vietqr.io/x.png", hosts)).toBe(false);
    expect(isAllowedLogoUrl("https://cdn.vietqr.io.evil.io/x.png", hosts)).toBe(
      false,
    );
  });
});
