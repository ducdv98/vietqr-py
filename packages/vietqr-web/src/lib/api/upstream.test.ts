import { describe, expect, it } from "vitest";
import { resolveUpstream } from "./upstream";

const api = "http://api:8000";

describe("resolveUpstream", () => {
  it("maps /api/health to the API's /health", () => {
    expect(resolveUpstream(api, ["health"], "")).toBe("http://api:8000/health");
  });

  it("passes /api/v1/vietqr-core/* through with its query", () => {
    expect(
      resolveUpstream(api, ["v1", "vietqr-core", "banks", "970415"], "?x=1"),
    ).toBe("http://api:8000/api/v1/vietqr-core/banks/970415?x=1");
  });

  it("refuses anything else (docs, openapi.json, traversal)", () => {
    expect(resolveUpstream(api, ["docs"], "")).toBeNull();
    expect(resolveUpstream(api, ["openapi.json"], "")).toBeNull();
    expect(resolveUpstream(api, ["v1", "..", "docs"], "")).toBeNull();
    expect(resolveUpstream(api, ["health", "x"], "")).toBeNull();
  });
});
