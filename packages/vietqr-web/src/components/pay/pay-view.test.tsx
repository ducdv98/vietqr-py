import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import vi_ from "../../../messages/vi.json";
import { defaultParams, parseParams } from "@/lib/studio/params";
import { PayView } from "./pay-view";

vi.mock("@/lib/banks/queries", () => ({
  useBanks: () => ({
    data: [
      {
        bin: "970436",
        code: "VCB",
        shortName: "Vietcombank",
        name: "x",
        logo: "",
      },
    ],
    error: null,
  }),
}));
vi.mock("@/lib/studio/queries", () => ({
  useStudioPayload: () => ({ data: undefined, error: null }),
}));

const params = parseParams(
  "bank=VCB&account=0123456789&amount=1234567&description=x",
  defaultParams(),
);

const view = (locale: "en" | "vi", p = params) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : vi_}
    >
      <PayView params={p} />
    </NextIntlClientProvider>,
  );

describe("PayView amount", () => {
  it("formats the amount in the active locale", () => {
    view("en");
    expect(screen.getByText(/^₫\s?1,234,567$/)).toBeInTheDocument();
  });
  it("uses Vietnamese grouping for vi", () => {
    view("vi");
    expect(screen.getByText(/^1\.234\.567\s?₫$/)).toBeInTheDocument();
  });
});

describe("PayView without an amount (static QR)", () => {
  const staticParams = parseParams(
    "bank=VCB&account=0123456789",
    defaultParams(),
  );
  it("shows no amount and explains that the payer enters it", () => {
    view("en", staticParams);
    expect(screen.getByTestId("pay-no-amount")).toHaveTextContent(
      /static QR.*enter the amount yourself/,
    );
    expect(screen.queryByText(/₫/)).toBeNull();
    expect(screen.getByText("0123456789")).toBeInTheDocument();
  });
  it("is localized in Vietnamese", () => {
    view("vi", staticParams);
    expect(screen.getByTestId("pay-no-amount")).toHaveTextContent(
      /QR tĩnh.*tự nhập số tiền/,
    );
  });
});
