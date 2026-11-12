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

const view = (locale: "en" | "vi") =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : vi_}
    >
      <PayView params={params} />
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
