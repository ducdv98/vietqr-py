import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseConfig } from "@/lib/config/parse";
import { AppShell } from "./app-shell";

const cfg = (extra: Record<string, string> = {}) =>
  parseConfig({ VIETQR_API_URL: "http://api:8000", ...extra });

describe("AppShell", () => {
  it("shows nav links only for enabled pages", () => {
    render(
      <AppShell config={cfg({ VIETQR_ENABLED_PAGES: "studio,banks" })}>
        x
      </AppShell>,
    );
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toHaveTextContent("Studio");
    expect(nav).toHaveTextContent("Banks");
    expect(nav).not.toHaveTextContent("Inspect");
  });

  it("renders app name and footer links", () => {
    render(
      <AppShell
        config={cfg({
          VIETQR_APP_NAME: "Acme",
          VIETQR_FOOTER_LINKS: "Docs|/docs",
        })}
      >
        x
      </AppShell>,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "/docs",
    );
  });
});
