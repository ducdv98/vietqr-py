import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { ApiError } from "@/lib/api/unwrap";
import { BANKS } from "./fixtures";
import { BanksBrowser } from "./banks-browser";

const state = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));
vi.mock("@/lib/banks/queries", () => ({ useBanks: () => state.value }));

const view = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BanksBrowser />
    </NextIntlClientProvider>,
  );

describe("BanksBrowser", () => {
  beforeEach(() => {
    state.value = {
      data: BANKS,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it("lists banks with Studio links prefilled by code", () => {
    view();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.getByRole("link", {
        name: "Create QR in Studio: Vietcombank",
      }),
    ).toHaveAttribute("href", "/?bank=VCB");
    expect(screen.getByRole("link", { name: "Vietcombank" })).toHaveAttribute(
      "href",
      "/banks/VCB",
    );
  });

  it("filters as you type, ignoring diacritics, and says when empty", async () => {
    const user = userEvent.setup();
    view();
    const box = screen.getByRole("searchbox", { name: "Search banks" });
    await user.type(box, "quan doi");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await user.clear(box);
    await user.type(box, "970436");
    expect(
      screen.getByRole("link", { name: "Vietcombank" }),
    ).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, "nope");
    expect(screen.getByText("No banks match “nope”.")).toBeInTheDocument();
  });

  it("shows a localized error with retry", () => {
    state.value = {
      data: undefined,
      isPending: false,
      error: new ApiError("99", "down", null, 0),
      refetch: vi.fn(),
    };
    view();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});
