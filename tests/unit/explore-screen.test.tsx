import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/AuthProvider";
import { ExploreScreen } from "@/features/explore/ExploreScreen";

/** Clerk state the mocked hooks report (no network, no real session). */
const clerkState = { isSignedIn: false };
const signInPassword = vi.fn(async () => ({ error: null }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/explore",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkState.isSignedIn }),
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({
    isLoaded: true,
    user: clerkState.isSignedIn
      ? {
          firstName: "Test",
          lastName: "Neighbour",
          primaryEmailAddress: { emailAddress: "test@example.com" },
          imageUrl: "",
          createdAt: new Date(2026, 0, 5),
        }
      : null,
  }),
  useSignIn: () => ({
    signIn: { password: signInPassword, status: "needs_identifier" },
  }),
  useSignUp: () => ({ signUp: {} }),
}));

function renderExplore() {
  return render(
    <AuthProvider>
      <ExploreScreen />
    </AuthProvider>,
  );
}

describe("ExploreScreen", () => {
  beforeEach(() => {
    clerkState.isSignedIn = false;
    signInPassword.mockClear();
  });

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

  it("shows owner details to a signed-in Clerk user", () => {
    clerkState.isSignedIn = true;
    renderExplore();
    expect(
      within(screen.getByRole("main")).getAllByText("Marc S.").length,
    ).toBeGreaterThan(0);
  });

  it("validates the sign-in form before calling Clerk", () => {
    renderExplore();
    fireEvent.click(
      screen.getAllByRole("button", { name: /Login \/ Register/ })[0]!,
    );
    const dialog = screen.getByRole("dialog", { name: "Welcome back" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));
    expect(
      within(dialog).getByText("Enter your email address."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Enter your password."),
    ).toBeInTheDocument();
    expect(signInPassword).not.toHaveBeenCalled();
  });
});
