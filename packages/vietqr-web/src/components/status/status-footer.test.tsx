import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import vi_ from "../../../messages/vi.json";
import { GENERATED_API_VERSION } from "@/lib/api/version";
import { StatusFooter } from "./status-footer";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/client")>()),
  api: { GET: get },
}));

const ok = (version?: string) => ({
  data: { status: "ok", ...(version ? { version } : {}) },
  response: new Response(null, { status: 200 }),
});

function renderIt(locale: "en" | "vi" = "en") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : vi_}
    >
      <QueryClientProvider client={client}>
        <StatusFooter />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("StatusFooter", () => {
  beforeEach(() => get.mockReset());

  it("shows up with the API version", async () => {
    get.mockResolvedValue(ok(GENERATED_API_VERSION));
    renderIt();
    expect(
      await screen.findByText(`API online · v${GENERATED_API_VERSION}`),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows down as text, not only color", async () => {
    get.mockResolvedValue({
      error: { code: "99", desc: "Bad gateway" },
      response: new Response(null, { status: 502 }),
    });
    renderIt();
    expect(await screen.findByText("API unreachable")).toBeInTheDocument();
  });

  it("warns when the API is older than the generated client", async () => {
    get.mockResolvedValue(ok("0.0.1"));
    renderIt();
    const warning = await screen.findByRole("alert");
    expect(warning).toHaveTextContent(
      `API v0.0.1 is older than the client expects (v${GENERATED_API_VERSION})`,
    );
  });

  it("shows up without a version when the API omits it", async () => {
    get.mockResolvedValue(ok());
    renderIt();
    expect(await screen.findByText("API online")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not warn for a newer API", async () => {
    get.mockResolvedValue(ok("99.0.0"));
    renderIt();
    await screen.findByText("API online · v99.0.0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders Vietnamese", async () => {
    get.mockResolvedValue({
      error: { code: "99", desc: "Bad gateway" },
      response: new Response(null, { status: 502 }),
    });
    renderIt("vi");
    expect(
      await screen.findByText("Không kết nối được API"),
    ).toBeInTheDocument();
  });
});
