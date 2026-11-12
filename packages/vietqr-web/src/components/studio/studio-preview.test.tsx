import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/unwrap";
import { defaultParams } from "@/lib/studio/params";
import type { StudioPayload } from "@/lib/studio/queries";
import { StudioPreview } from "./studio-preview";

const payload: StudioPayload = {
  qrCode: "000201...",
  qrDataURL: "data:image/png;base64,AAAA",
  request: {
    bankBin: "970436",
    accountNo: "0123",
    amount: "50000",
    description: "Lunch",
    template: "compact",
    serviceType: "account",
    format: "png",
    size: 500,
  },
};

const view = (props: Partial<Parameters<typeof StudioPreview>[0]>) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <StudioPreview payload={null} params={defaultParams()} {...props} />
    </NextIntlClientProvider>,
  );

describe("StudioPreview", () => {
  it("asks for input when there is no payload", () => {
    view({});
    expect(screen.getByRole("status")).toHaveTextContent(/Fill in the form/);
  });

  it("shows the image, payload and a PNG download link", () => {
    view({ payload });
    expect(screen.getByRole("img")).toHaveAttribute("src", payload.qrDataURL);
    expect(screen.getByTestId("payload")).toHaveTextContent("000201...");
    const link = screen.getByRole("link", { name: "Download PNG" });
    expect(link).toHaveAttribute("download");
    expect(link.getAttribute("href")).toMatch(
      /^\/api\/v1\/vietqr-core\/image\?bankBin=970436&accountNo=0123&amount=50000/,
    );
  });

  it("shows a localized error instead of a stale image", () => {
    view({ payload, error: new ApiError("02", "bad amount", null, 400) });
    expect(screen.getByRole("alert")).toHaveTextContent(/amount is not valid/);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
