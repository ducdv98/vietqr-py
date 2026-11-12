import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/unwrap";
import { defaultParams } from "@/lib/studio/params";
import type { StudioPayload } from "@/lib/studio/queries";
import { ConfigProvider } from "@/lib/config";
import { parseConfig } from "@/lib/config/parse";
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

const view = (
  props: Partial<Parameters<typeof StudioPreview>[0]>,
  env: Record<string, string> = {},
) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ConfigProvider
        config={parseConfig({ VIETQR_API_URL: "http://api:8000", ...env })}
      >
        <StudioPreview payload={null} params={defaultParams()} {...props} />
      </ConfigProvider>
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

  it("shows the QR type: dynamic with an amount, static without", () => {
    const { unmount } = view({ payload });
    expect(screen.getByTestId("qr-type")).toHaveTextContent(
      /QR type:\s*Dynamic/,
    );
    unmount();
    view({
      payload: {
        ...payload,
        request: { ...payload.request, amount: undefined },
      },
    });
    expect(screen.getByTestId("qr-type")).toHaveTextContent(
      /QR type:\s*Static.*payer enters it/,
    );
  });

  it("shows a localized error instead of a stale image", () => {
    view({ payload, error: new ApiError("02", "bad amount", null, 400) });
    expect(screen.getByRole("alert")).toHaveTextContent(/amount is not valid/);
    expect(screen.queryByRole("img")).toBeNull();
  });

  describe("copy actions", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    beforeEach(() => {
      writeText.mockClear();
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
    });

    const params = { ...defaultParams(), bank: "VCB", account: "0123" };

    it("hides Copy Pay link when the pay page is disabled", () => {
      view({ payload, params });
      expect(
        screen.getByRole("button", { name: "Copy Payload" }),
      ).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "Copy Pay link" }),
      ).not.toBeInTheDocument();
    });

    it("shows Copy Pay link when enabled and copies an absolute /pay URL", async () => {
      view({ payload, params }, { VIETQR_ENABLED_PAGES: "studio,pay" });
      await userEvent.click(
        screen.getByRole("button", { name: "Copy Pay link" }),
      );
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/pay?bank=VCB&account=0123`,
      );
      expect(screen.getByText("Pay link copied.")).toBeInTheDocument();
    });

    it("copies the Payload and announces it", async () => {
      view({ payload, params });
      await userEvent.click(
        screen.getByRole("button", { name: "Copy Payload" }),
      );
      expect(writeText).toHaveBeenCalledWith("000201...");
      expect(screen.getByText("Payload copied.")).toBeInTheDocument();
    });

    it("warns about the account number and copies the embed URL", async () => {
      view({ payload, params });
      expect(screen.getByTestId("embed-warning")).toHaveTextContent(
        /account number/,
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Copy image URL" }),
      );
      expect(writeText).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(
            `^${window.location.origin}/api/v1/vietqr-core/image\\?bankBin=970436`,
          ),
        ),
      );
    });

    it("reports a failed copy", async () => {
      writeText.mockRejectedValueOnce(new Error("denied"));
      view({ payload, params });
      await userEvent.click(
        screen.getByRole("button", { name: "Copy Payload" }),
      );
      expect(screen.getByText(/Could not copy/)).toBeInTheDocument();
    });
  });
});

describe("static QR actions", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  it("omits the amount from the embed URL and Pay link", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const request = {
      ...payload.request,
      amount: undefined,
      description: undefined,
    };
    view(
      {
        payload: { ...payload, request },
        params: { ...defaultParams(), bank: "VCB", account: "0123" },
      },
      { VIETQR_ENABLED_PAGES: "studio,pay" },
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Copy image URL" }),
    );
    expect(writeText.mock.calls.at(-1)?.[0]).not.toMatch(/amount|description/);
    await userEvent.click(
      screen.getByRole("button", { name: "Copy Pay link" }),
    );
    expect(writeText).toHaveBeenLastCalledWith(
      `${window.location.origin}/pay?bank=VCB&account=0123`,
    );
  });
});
