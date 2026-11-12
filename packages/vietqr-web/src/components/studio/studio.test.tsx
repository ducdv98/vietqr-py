import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { BANKS } from "@/components/banks/fixtures";
import { ConfigProvider } from "@/lib/config";
import { parseConfig } from "@/lib/config/parse";
import { makeQueryClient } from "@/lib/query/provider";
import { defaultParams, type StudioParams } from "@/lib/studio/params";
import { Studio } from "./studio";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/client")>()),
  api: { GET: get },
}));

const ok = (data: unknown) => ({
  data: { code: "00", desc: "ok", data },
  response: new Response(null, { status: 200 }),
});

let generateCalls: Record<string, string>[];

beforeEach(() => {
  generateCalls = [];
  Element.prototype.scrollIntoView = vi.fn();
  get.mockReset();
  get.mockImplementation(
    async (
      path: string,
      init?: { params?: { query?: Record<string, string> } },
    ) => {
      if (path.endsWith("/banks")) return ok(BANKS);
      const q = init?.params?.query ?? {};
      generateCalls.push(q);
      return ok({
        qrCode: `PAYLOAD-${q.amount ?? "static"}`,
        qrDataURL: `data:image/png;base64,${q.template}`,
      });
    },
  );
});

function setup(initial: Partial<StudioParams> = {}) {
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <QueryClientProvider client={makeQueryClient()}>
        <ConfigProvider
          config={parseConfig({ VIETQR_API_URL: "http://api:8000" })}
        >
          <Studio initial={{ ...defaultParams(), ...initial }} />
        </ConfigProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return user;
}

const generate = () => screen.getByRole("button", { name: "Generate" });
const typeGroup = () => screen.getByRole("radiogroup", { name: "QR type" });

async function pickBank(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Bank" }));
  await user.click(await screen.findByRole("option", { name: /Vietcombank/ }));
}

describe("Studio: QR type and explicit Generate", () => {
  it("defaults to static with no amount field; dynamic shows it", async () => {
    const user = setup();
    expect(
      within(typeGroup()).getByRole("radio", { name: "Static" }),
    ).toBeChecked();
    expect(screen.queryByLabelText("Amount (VND)")).toBeNull();
    await user.click(
      within(typeGroup()).getByRole("radio", { name: "Dynamic" }),
    );
    expect(screen.getByLabelText("Amount (VND)")).toBeInTheDocument();
  });

  it("starts dynamic when the prefill carries an amount", () => {
    setup({ amount: "5000" });
    expect(
      within(typeGroup()).getByRole("radio", { name: "Dynamic" }),
    ).toBeChecked();
  });

  it("disables Generate and names what is missing", async () => {
    const user = setup();
    await screen.findByRole("combobox", { name: "Bank" });
    expect(generate()).toBeDisabled();
    const hint = screen.getByText(/Complete first/);
    expect(generate()).toHaveAttribute("aria-describedby", hint.id);
    expect(hint).toHaveTextContent("Bank, Account number");
    await user.click(
      within(typeGroup()).getByRole("radio", { name: "Dynamic" }),
    );
    expect(hint).toHaveTextContent("Bank, Account number, Amount (VND)");
  });

  it("static sends no amount, even if one was typed under dynamic", async () => {
    const user = setup();
    await pickBank(user);
    await user.click(
      within(typeGroup()).getByRole("radio", { name: "Dynamic" }),
    );
    await user.type(screen.getByLabelText("Amount (VND)"), "5000");
    await user.click(
      within(typeGroup()).getByRole("radio", { name: "Static" }),
    );
    await user.type(screen.getByLabelText("Account number"), "0123");
    await user.click(generate());
    await waitFor(() => expect(generateCalls).toHaveLength(1));
    expect("amount" in generateCalls[0]!).toBe(false);
    // Switching back restores the amount.
    await user.click(
      within(typeGroup()).getByRole("radio", { name: "Dynamic" }),
    );
    expect(screen.getByLabelText("Amount (VND)")).toHaveValue("5000");
  });

  it("dynamic requires an amount and sends it", async () => {
    const user = setup({ bank: "VCB", account: "0123", amount: "5000" });
    await screen.findByRole("combobox", { name: "Bank" });
    await user.clear(screen.getByLabelText("Amount (VND)"));
    await waitFor(() => expect(generate()).toBeDisabled());
    await user.type(screen.getByLabelText("Amount (VND)"), "7000");
    await waitFor(() => expect(generate()).toBeEnabled());
    await user.click(generate());
    await waitFor(() => expect(generateCalls).toHaveLength(1));
    expect(generateCalls[0]!.amount).toBe("7000");
  });

  it("fires no request without a click, even when prefilled and valid", async () => {
    const user = setup({ bank: "VCB", account: "0123", amount: "5000" });
    await waitFor(() => expect(generate()).toBeEnabled());
    await user.type(screen.getByLabelText("Description"), "Lunch");
    await new Promise((r) => setTimeout(r, 600));
    expect(generateCalls).toHaveLength(0);
    await user.click(generate());
    await waitFor(() => expect(generateCalls).toHaveLength(1));
  });

  it("keeps the old result after an edit, dimmed and marked outdated", async () => {
    const user = setup({ bank: "VCB", account: "0123", amount: "5000" });
    await waitFor(() => expect(generate()).toBeEnabled());
    await user.click(generate());
    const img = await screen.findByRole("img", {
      name: "Generated VietQR card",
    });
    expect(screen.queryByText("Outdated")).toBeNull();
    await user.type(screen.getByLabelText("Description"), "x");
    expect(screen.getByText("Outdated")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Generated VietQR card" })).toBe(
      img,
    );
    expect(img.className).toMatch(/opacity/);
    await user.click(generate());
    await waitFor(() => expect(screen.queryByText("Outdated")).toBeNull());
  });
});

describe("Studio: result card and layout", () => {
  const prefilled = { bank: "VCB", account: "0123", amount: "5000" } as const;

  it("keeps the result pane empty until Generate", async () => {
    setup(prefilled);
    expect(
      screen.queryByRole("img", { name: "Generated VietQR card" }),
    ).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Template" })).toBeNull();
    expect(screen.getByText(/press Generate/)).toBeInTheDocument();
  });

  it("shows the result card with actions, hint and note after Generate", async () => {
    const user = setup(prefilled);
    await waitFor(() => expect(generate()).toBeEnabled());
    await user.click(generate());
    await screen.findByRole("img", { name: "Generated VietQR card" });
    const result = screen.getByRole("region", { name: "Preview" });
    expect(
      within(result).getByRole("link", { name: "Download PNG" }),
    ).toBeVisible();
    expect(
      within(result).getByRole("button", { name: "Copy Payload" }),
    ).toBeVisible();
    expect(
      within(result).getByText(/Scan with your banking app/),
    ).toBeVisible();
    expect(within(result).getByText(/Nothing is stored/)).toBeVisible();
    // Payload details start collapsed.
    expect(
      within(result).getByText("Payload details").closest("details"),
    ).not.toHaveAttribute("open");
  });

  it("re-renders on Template switch without another Generate click", async () => {
    const user = setup(prefilled);
    await waitFor(() => expect(generate()).toBeEnabled());
    await user.click(generate());
    const img = await screen.findByRole("img", {
      name: "Generated VietQR card",
    });
    expect(img).toHaveAttribute("src", expect.stringContaining("compact"));
    const chips = screen.getByRole("radiogroup", { name: "Template" });
    await user.click(within(chips).getByRole("radio", { name: "Print sheet" }));
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "Generated VietQR card" }),
      ).toHaveAttribute("src", expect.stringContaining("print")),
    );
    expect(generateCalls.map((c) => c.template)).toEqual(["compact", "print"]);
    expect(screen.queryByText("Outdated")).toBeNull();
  });

  it("scrolls to the result after Generate", async () => {
    const user = setup(prefilled);
    await waitFor(() => expect(generate()).toBeEnabled());
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await user.click(generate());
    await waitFor(() =>
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled(),
    );
  });
});
