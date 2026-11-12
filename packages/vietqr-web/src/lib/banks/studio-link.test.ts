import { describe, expect, it } from "vitest";
import { STUDIO_BANK_PARAM, studioHref } from "./studio-link";

describe("studioHref", () => {
  it("prefills Studio with the bank code", () => {
    expect(STUDIO_BANK_PARAM).toBe("bank");
    expect(studioHref({ code: "VCB", bin: "970436" })).toBe("/?bank=VCB");
  });
  it("falls back to the BIN when the code is empty", () => {
    expect(studioHref({ code: "", bin: "970436" })).toBe("/?bank=970436");
  });
  it("encodes unusual codes", () => {
    expect(studioHref({ code: "A&B", bin: "1" })).toBe("/?bank=A%26B");
  });
});
