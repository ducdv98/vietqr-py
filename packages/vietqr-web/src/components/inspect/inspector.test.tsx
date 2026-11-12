import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { ConfigProvider } from "@/lib/config";
import { parseConfig } from "@/lib/config/parse";
import { Inspector } from "./inspector";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/client")>()),
  api: { POST: post },
}));

const INFO = {
  accountNo: "0011004",
  amount: "50000",
  bankBin: "970436",
  bankInfo: {
    bin: "970436",
    code: "VCB",
    shortName: "Vietcombank",
    name: "Ngan hang TMCP Ngoai Thuong",
    logo: "",
  },
  description: "cafe",
  isDynamic: true,
  isValidCrc: true,
  qrType: "dynamic",
  serviceType: "account",
  crc: "ABCD",
  rawPayload: "000201...ABCD",
  rawTags: { "00": "01", "54": "50000" },
};

const ok = (data: unknown) => ({
  data: { code: "00", desc: "success", data },
  response: new Response(null, { status: 200 }),
});
const fail = (code: string, status = 400) => ({
  error: { code, desc: "nope", data: null },
  response: new Response(null, { status }),
});

function setup(maxUploadBytes = 1000) {
  const user = userEvent.setup();
  const config = parseConfig({
    VIETQR_API_URL: "http://x",
    VIETQR_MAX_UPLOAD_BYTES: String(maxUploadBytes),
  });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ConfigProvider config={config}>
        <QueryClientProvider client={new QueryClient()}>
          <Inspector />
        </QueryClientProvider>
      </ConfigProvider>
    </NextIntlClientProvider>,
  );
  return { user };
}

const png = (size = 10, name = "qr.png", type = "image/png") =>
  new File([new Uint8Array(size)], name, { type });

beforeEach(() => post.mockReset());

describe("Inspector", () => {
  it("parses a pasted payload into one breakdown", async () => {
    post.mockResolvedValue(ok(INFO));
    const { user } = setup();
    await user.type(screen.getByLabelText("Payload"), "000201abc");
    await user.click(screen.getByRole("button", { name: "Read payload" }));

    expect(await screen.findByText("Checksum valid")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/api/v1/vietqr-core/parse", {
      body: { qrCode: "000201abc" },
    });
    expect(screen.getByText("Vietcombank")).toBeInTheDocument();
    expect(screen.getByText("0011004")).toBeInTheDocument();
    expect(screen.getByText(/50[.,]000/)).toBeInTheDocument();
    expect(screen.getByText("cafe")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "54" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create similar QR" }),
    ).toHaveAttribute(
      "href",
      "/?bank=VCB&account=0011004&amount=50000&description=cafe",
    );
  });

  it("flags an invalid checksum but still shows the breakdown", async () => {
    post.mockResolvedValue(ok({ ...INFO, isValidCrc: false }));
    const { user } = setup();
    await user.type(screen.getByLabelText("Payload"), "x");
    await user.click(screen.getByRole("button", { name: "Read payload" }));
    expect(await screen.findByText("Checksum invalid")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/does not match/);
    expect(screen.getByText("0011004")).toBeInTheDocument();
  });

  it("shows a not-VietQR error for an invalid payload", async () => {
    post.mockResolvedValue(fail("07"));
    const { user } = setup();
    await user.type(screen.getByLabelText("Payload"), "hello");
    await user.click(screen.getByRole("button", { name: "Read payload" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /not a valid VietQR code/,
    );
  });

  it("uploads an image to /decode and shows the same breakdown", async () => {
    post.mockResolvedValue(ok(INFO));
    const { user } = setup();
    await user.upload(screen.getByLabelText(/Choose image/), png());
    expect(await screen.findByText("Checksum valid")).toBeInTheDocument();
    expect(post.mock.calls[0]![0]).toBe("/api/v1/vietqr-core/decode");
    const opts = post.mock.calls[0]![1];
    const form = opts.bodySerializer(opts.body) as FormData;
    expect((form.get("file") as File).name).toBe("qr.png");
  });

  it("shows a decode failure", async () => {
    post.mockResolvedValue(fail("06"));
    const { user } = setup();
    await user.upload(screen.getByLabelText(/Choose image/), png());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not read a QR code from this image.",
    );
  });

  it("rejects an oversized file client-side using the configured limit", async () => {
    const { user } = setup(1000);
    await user.upload(screen.getByLabelText(/Choose image/), png(2000));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That file is too large. The limit is 1000 B.",
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("accepts a dropped image", async () => {
    post.mockResolvedValue(ok(INFO));
    setup();
    const zone = screen.getByTestId("dropzone");
    const file = png();
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.drop(zone, { dataTransfer: { files: [file], types: ["Files"] } });
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(await screen.findByText("Checksum valid")).toBeInTheDocument();
  });
});
