import { describe, expect, it } from "vitest";
import { compareVersions, isOlder } from "./semver";

describe("compareVersions", () => {
  it.each([
    ["0.1.0", "0.1.0", 0],
    ["0.1.0", "0.2.0", -1],
    ["1.0.0", "0.9.9", 1],
    ["0.1.10", "0.1.9", 1],
    ["v1.2.3", "1.2.3", 0],
    ["1.2", "1.2.0", 0],
    ["1.0.0-rc.1", "1.0.0", -1],
    ["1.0.0+build5", "1.0.0", 0],
  ])("compares %s with %s", (a, b, expected) => {
    expect(compareVersions(a, b)).toBe(expected);
  });

  it("returns null when a version is not parseable", () => {
    expect(compareVersions("unknown", "1.0.0")).toBeNull();
    expect(compareVersions("1.0.0", "")).toBeNull();
  });
});

describe("isOlder", () => {
  it("is true only when strictly older", () => {
    expect(isOlder("0.1.0", "0.2.0")).toBe(true);
    expect(isOlder("0.2.0", "0.2.0")).toBe(false);
    expect(isOlder("0.3.0", "0.2.0")).toBe(false);
  });
  it("is false when unparseable (no false warnings)", () => {
    expect(isOlder("dev", "0.2.0")).toBe(false);
  });
});
