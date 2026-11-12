import { describe, expect, it } from "vitest";
import { findBank } from "./find";

const banks = [
  { bin: "970436", code: "VCB" },
  { bin: "970422", code: "MB" },
];

describe("findBank", () => {
  it("matches by exact BIN", () => {
    expect(findBank(banks, "970422")).toBe(banks[1]);
  });
  it("matches by code, case-insensitively, ignoring surrounding spaces", () => {
    expect(findBank(banks, " vcb ")).toBe(banks[0]);
  });
  it("returns null for empty, nullish or unknown values", () => {
    expect(findBank(banks, "")).toBeNull();
    expect(findBank(banks, "  ")).toBeNull();
    expect(findBank(banks, null)).toBeNull();
    expect(findBank(banks, undefined)).toBeNull();
    expect(findBank(banks, "XYZ")).toBeNull();
  });
});
