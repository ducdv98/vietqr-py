import { describe, expect, it } from "vitest";
import { getNavItems } from "./nav";

describe("getNavItems", () => {
  it("returns only enabled pages", () => {
    expect(getNavItems(["studio", "banks"]).map((i) => i.href)).toEqual([
      "/",
      "/banks",
    ]);
  });
  it("never lists pay in the nav", () => {
    expect(getNavItems(["studio", "pay"]).map((i) => i.page)).toEqual([
      "studio",
    ]);
  });
});
