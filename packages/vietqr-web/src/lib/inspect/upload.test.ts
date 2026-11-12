import { describe, expect, it } from "vitest";
import { checkUpload } from "./upload";

const file = (size: number, type = "image/png") => ({ size, type });

describe("checkUpload", () => {
  it("accepts an image within the limit, including exactly at the limit", () => {
    expect(checkUpload(file(1000), 1000)).toEqual({ ok: true });
  });
  it("rejects an image over the limit", () => {
    expect(checkUpload(file(1001), 1000)).toEqual({
      ok: false,
      reason: "tooLarge",
    });
  });
  it("rejects non-image files", () => {
    expect(checkUpload(file(10, "application/pdf"), 1000)).toEqual({
      ok: false,
      reason: "notImage",
    });
  });
  it("rejects empty files", () => {
    expect(checkUpload(file(0), 1000)).toEqual({ ok: false, reason: "empty" });
  });
});

import { formatBytes } from "./upload";
describe("formatBytes", () => {
  it("formats bytes, KB and MB", () => {
    expect(formatBytes(1000)).toBe("1000 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(8 * 1024 * 1024)).toBe("8 MB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
