import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseConfig } from "@/lib/config/parse";

const getConfig = vi.hoisted(() => vi.fn());
vi.mock("@/lib/config/server", () => ({ getConfig }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import HomePage from "./page";

const cfg = (pages: string) =>
  parseConfig({
    VIETQR_API_URL: "http://api:8000",
    VIETQR_ENABLED_PAGES: pages,
  });

describe("HomePage (Studio)", () => {
  beforeEach(() => getConfig.mockReset());

  it("is not found when the studio page is disabled", async () => {
    getConfig.mockReturnValue(cfg("inspect,banks"));
    await expect(
      HomePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders when the studio page is enabled", async () => {
    getConfig.mockReturnValue(cfg("studio"));
    await expect(
      HomePage({ searchParams: Promise.resolve({}) }),
    ).resolves.toBeTruthy();
  });
});
