import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import { ApiError } from "@/lib/api/unwrap";
import { ApiErrorAlert, useApiErrorMessage } from "./api-error";

const CODES = ["01", "02", "03", "04", "05", "06", "07", "99"];

const wrap = (locale: "en" | "vi") =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "en" ? en : vi}
      >
        {children}
      </NextIntlClientProvider>
    );
  };

const err = (
  code: string,
  desc = "server words",
  cid: string | null = "cid-1",
) => new ApiError(code, desc, cid, 400);

describe("useApiErrorMessage", () => {
  it.each(CODES)("code %s has distinct copy in en and vi", (code) => {
    const e = err(code, "RAW DESC");
    const get = (l: "en" | "vi") =>
      renderHook(() => useApiErrorMessage(), {
        wrapper: wrap(l),
      }).result.current(e);
    const [a, b] = [get("en"), get("vi")];
    for (const m of [a, b]) {
      expect(m).not.toBe("RAW DESC");
      expect(m).not.toMatch(/^Errors\./);
      expect(m.length).toBeGreaterThan(0);
    }
    expect(a).not.toBe(b);
  });

  it("falls back to desc for an unknown code", () => {
    const { result } = renderHook(() => useApiErrorMessage(), {
      wrapper: wrap("en"),
    });
    expect(result.current(err("42", "Something odd"))).toBe("Something odd");
  });

  it("treats a non-ApiError as an internal error", () => {
    const { result } = renderHook(() => useApiErrorMessage(), {
      wrapper: wrap("en"),
    });
    expect(result.current(new Error("boom"))).toBe(result.current(err("99")));
  });
});

describe("ApiErrorAlert", () => {
  it("shows the localized message as an alert", () => {
    render(<ApiErrorAlert error={err("04")} />, { wrapper: wrap("vi") });
    expect(screen.getByRole("alert")).toHaveTextContent(/ngân hàng/i);
  });

  it("hides desc and correlation id until technical detail is expanded", async () => {
    render(<ApiErrorAlert error={err("04", "No bank for BIN 1")} />, {
      wrapper: wrap("en"),
    });
    const summary = screen.getByText("Technical detail");
    expect(screen.getByText(/No bank for BIN 1/)).not.toBeVisible();
    await userEvent.click(summary);
    expect(screen.getByText(/No bank for BIN 1/)).toBeVisible();
    expect(screen.getByText(/cid-1/)).toBeVisible();
  });

  it("omits the correlation id when absent", () => {
    render(<ApiErrorAlert error={err("99", "x", null)} />, {
      wrapper: wrap("en"),
    });
    expect(screen.queryByText(/Correlation ID/)).toBeNull();
  });

  it("shows desc as the message for an unknown code", () => {
    render(<ApiErrorAlert error={err("42", "Something odd")} />, {
      wrapper: wrap("en"),
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Something odd");
  });
});
