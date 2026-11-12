import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BankLogo } from "./bank-logo";

describe("BankLogo", () => {
  it("loads the logo from the same-origin route, never the catalog URL", () => {
    const { container } = render(
      <BankLogo logo="https://cdn.vietqr.io/img/VCB.png" code="VCB" />,
    );
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/api/logos/VCB");
    expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("shows the code badge when there is no logo or it fails to load", () => {
    const { container, rerender } = render(<BankLogo logo="" code="MBBK" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("MBBK")).toBeTruthy();
    rerender(<BankLogo logo="https://x.io/a.png" code="ABC" />);
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByText("ABC")).toBeTruthy();
  });
});
