import { describe, expect, it } from "vitest";
import { formatVnd } from "./amount";

describe("formatVnd", () => {
  it("formats with the given locale", () => {
    expect(formatVnd("50000", "en")).toMatch(/^₫\s?50,000$/);
    expect(formatVnd("50000", "vi")).toMatch(/^50\.000\s?₫$/);
  });
});
