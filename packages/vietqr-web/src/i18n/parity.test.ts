import { describe, expect, it } from "vitest";
import { compareMessages } from "./parity";

describe("compareMessages", () => {
  it("reports no problems for identical key sets with different values", () => {
    expect(
      compareMessages({ a: "x", b: { c: "y" } }, { a: "z", b: { c: "w" } }),
    ).toEqual([]);
  });

  it("reports keys missing from the locale, using dotted paths", () => {
    expect(
      compareMessages({ a: "x", b: { c: "y" } }, { a: "x", b: {} }),
    ).toEqual([{ kind: "missing", key: "b.c" }]);
  });

  it("reports keys the locale has that en lacks", () => {
    expect(compareMessages({ a: "x" }, { a: "x", extra: "y" })).toEqual([
      { kind: "extra", key: "extra" },
    ]);
  });

  it("reports a leaf where en has a namespace (and vice versa) as a mismatch", () => {
    expect(compareMessages({ b: { c: "y" } }, { b: "oops" })).toEqual([
      { kind: "missing", key: "b.c" },
      { kind: "extra", key: "b" },
    ]);
  });
});
