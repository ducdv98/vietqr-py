import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { BankPicker } from "./bank-picker";
import { BANKS } from "./fixtures";

function setup(value: string | null = null) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BankPicker
        banks={BANKS}
        value={value}
        onChange={onChange}
        aria-label="Bank"
      />
    </NextIntlClientProvider>,
  );
  return {
    onChange,
    user,
    input: screen.getByRole("combobox", { name: "Bank" }),
  };
}

describe("BankPicker", () => {
  it("is a collapsed combobox until used", () => {
    const { input } = setup();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("filters diacritic-insensitively and selects with the keyboard", async () => {
    const { input, user, onChange } = setup();
    await user.click(input);
    expect(screen.getAllByRole("option")).toHaveLength(3);
    await user.type(input, "quan doi");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option").id,
    );
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(BANKS[2]);
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("navigates with arrows and closes on Escape", async () => {
    const { input, user, onChange } = setup();
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const opts = screen.getAllByRole("option");
    expect(input).toHaveAttribute("aria-activedescendant", opts[2]!.id);
    await user.keyboard("{ArrowUp}{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects by clicking an option", async () => {
    const { input, user, onChange } = setup();
    await user.click(input);
    await user.click(screen.getByRole("option", { name: /Vietcombank/ }));
    expect(onChange).toHaveBeenCalledWith(BANKS[1]);
  });

  it("shows the selected bank (by code or BIN) and can clear it", async () => {
    const { input, user, onChange } = setup("vcb");
    expect(input).toHaveValue(
      "Vietcombank - Ngân hàng TMCP Ngoại Thương Việt Nam",
    );
    await user.click(screen.getByRole("button", { name: "Clear bank" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("reports when nothing matches", async () => {
    const { input, user } = setup();
    await user.type(input, "zzzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No matching banks")).toBeInTheDocument();
  });
});
