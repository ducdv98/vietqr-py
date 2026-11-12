import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import vi_ from "../../../messages/vi.json";
import { parseConfig } from "@/lib/config/parse";
import { ConfigProvider } from "@/lib/config";
import { AppShell } from "./app-shell";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));
vi.mock("@/lib/api/client", () => ({
  api: { GET: () => new Promise(() => {}) },
  unwrap: (p: Promise<unknown>) => p,
}));

const cfg = (extra: Record<string, string> = {}) =>
  parseConfig({ VIETQR_API_URL: "http://api:8000", ...extra });

function renderShell(
  config: ReturnType<typeof cfg>,
  locale: "en" | "vi" = "en",
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : vi_}
    >
      <ConfigProvider config={config}>
        <QueryClientProvider client={new QueryClient()}>
          <AppShell config={config}>x</AppShell>
        </QueryClientProvider>
      </ConfigProvider>
    </NextIntlClientProvider>,
  );
}

describe("AppShell", () => {
  it("shows nav links only for enabled pages", () => {
    renderShell(cfg({ VIETQR_ENABLED_PAGES: "studio,banks" }));
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toHaveTextContent("Studio");
    expect(nav).toHaveTextContent("Banks");
    expect(nav).not.toHaveTextContent("Inspect");
  });

  it("renders app name and footer links", () => {
    renderShell(
      cfg({
        VIETQR_APP_NAME: "Acme",
        VIETQR_FOOTER_LINKS: "Docs|/docs",
      }),
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "/docs",
    );
  });

  it("translates nav labels and offers a locale switcher", () => {
    renderShell(cfg({ VIETQR_ENABLED_PAGES: "studio,banks" }), "vi");
    expect(screen.getByRole("navigation", { name: "Chính" })).toHaveTextContent(
      "Tạo mã",
    );
    expect(
      screen.getByRole("combobox", { name: "Ngôn ngữ" }),
    ).toBeInTheDocument();
  });

  it("hides the switcher when only one locale is enabled", () => {
    renderShell(cfg({ VIETQR_LOCALES: "vi" }));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
