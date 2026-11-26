import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MockSessionProvider } from "@/features/auth/MockSessionProvider";
import { ExploreScreen } from "@/features/explore/ExploreScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

function renderExplore() {
  return render(
    <MockSessionProvider>
      <ExploreScreen />
    </MockSessionProvider>,
  );
}

describe("ExploreScreen", () => {
  it("lists tools without owner details for signed-out visitors", () => {
    renderExplore();
    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("heading", { name: "Projector" }),
    ).toBeInTheDocument();
    expect(within(main).queryByText("Marc S.")).not.toBeInTheDocument();
    expect(within(main).queryByText("Building A")).not.toBeInTheDocument();
  });

  it("filters by category", () => {
    renderExplore();
    const main = screen.getByRole("main");
    fireEvent.click(
      within(main).getByRole("button", { name: "Garden & Outdoor" }),
    );
    expect(
      within(main).getByRole("heading", { name: "Garden Tool Set" }),
    ).toBeInTheDocument();
    expect(
      within(main).queryByRole("heading", { name: "Projector" }),
    ).not.toBeInTheDocument();
  });

  it("shows owner details after the mock sign-in", () => {
    renderExplore();
    fireEvent.click(
      screen.getAllByRole("button", { name: /Login \/ Register/ })[0]!,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(
      within(screen.getByRole("main")).getAllByText("Marc S.").length,
    ).toBeGreaterThan(0);
  });
});
