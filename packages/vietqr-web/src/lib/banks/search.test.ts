import { describe, expect, it } from "vitest";
import { foldText, searchBanks, type SearchableBank } from "./search";

const banks: SearchableBank[] = [
  {
    bin: "970415",
    code: "ICB",
    shortName: "VietinBank",
    name: "Ngân hàng TMCP Công thương Việt Nam",
  },
  {
    bin: "970436",
    code: "VCB",
    shortName: "Vietcombank",
    name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
  },
  {
    bin: "970422",
    code: "MB",
    shortName: "MBBank",
    name: "Ngân hàng TMCP Quân đội",
  },
];

describe("foldText", () => {
  it("strips diacritics, maps đ and lowercases", () => {
    expect(foldText("Quân Đội")).toBe("quan doi");
  });
  it("handles decomposed input", () => {
    expect(foldText("Công".normalize("NFD"))).toBe("cong");
  });
});

describe("searchBanks", () => {
  it("returns everything for an empty or blank query", () => {
    expect(searchBanks(banks, "")).toEqual(banks);
    expect(searchBanks(banks, "   ")).toEqual(banks);
  });
  it("matches name without diacritics", () => {
    expect(searchBanks(banks, "quan doi").map((b) => b.code)).toEqual(["MB"]);
    expect(searchBanks(banks, "QUÂN ĐỘI").map((b) => b.code)).toEqual(["MB"]);
  });
  it("matches short name, code and BIN", () => {
    expect(searchBanks(banks, "vietcom").map((b) => b.code)).toEqual(["VCB"]);
    expect(searchBanks(banks, "icb").map((b) => b.code)).toEqual(["ICB"]);
    expect(searchBanks(banks, "970422").map((b) => b.code)).toEqual(["MB"]);
  });
  it("requires every word to match, in any order", () => {
    expect(searchBanks(banks, "thuong viet").map((b) => b.code)).toEqual([
      "ICB",
      "VCB",
    ]);
    expect(searchBanks(banks, "thuong zzz")).toEqual([]);
  });
  it("ranks exact code/BIN, then prefix, then substring", () => {
    expect(searchBanks(banks, "mb").map((b) => b.code)[0]).toBe("MB");
    expect(searchBanks(banks, "viet").map((b) => b.code)).toEqual([
      "ICB",
      "VCB",
    ]);
    const more = [
      { bin: "1", code: "XMB", shortName: "Other", name: "Has mb inside" },
      ...banks,
    ];
    expect(searchBanks(more, "mb").map((b) => b.code)).toEqual([
      "MB",
      "XMB",
      "VCB",
    ]);
  });
  it("does not mutate the input", () => {
    const copy = [...banks];
    searchBanks(banks, "viet");
    expect(banks).toEqual(copy);
  });
});
