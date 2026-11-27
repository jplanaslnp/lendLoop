import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/AuthProvider";
import { ExploreScreen } from "@/features/explore/ExploreScreen";
import type { ListingCard } from "@/features/listings/types";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Convex and Clerk are mocked: these tests cover how Explore renders what
 * `listings.list` returns. The privacy rule itself (no owner for logged-out
 * visitors) is enforced and tested in Convex (tests/convex/listings.test.ts).
 */
const clerkState = { isSignedIn: false };
const signInPassword = vi.fn(async () => ({ error: null }));

const item = (
  name: string,
  category: ListingCard["category"],
  extra: Partial<ListingCard> = {},
): ListingCard => ({
  id: `id_${name}` as Id<"listings">,
  name,
  category,
  condition: "good",
  description: `${name} description`,
  availability: "available",
  locationLabel: "Patershol, Gent",
  photos: [],
  ...extra,
});

const PUBLIC: ListingCard[] = [
  item("Projector", "electronics", { condition: "like_new" }),
  item("Garden Tool Set", "garden", { availability: "borrowed" }),
];
const MEMBER: ListingCard[] = PUBLIC.map((card) => ({
  ...card,
  owner: { profileId: "marc", displayName: "Marc S.", imageUrl: null },
}));

const queryState: {
  result: ListingCard[] | undefined | Error;
  calls: unknown[];
} = { result: PUBLIC, calls: [] };

vi.mock("convex/react", () => ({
  useQuery: (_query: unknown, args: { category?: string }) => {
    queryState.calls.push(args);
    const { result } = queryState;
    if (result instanceof Error) throw result;
    if (!result || !args.category) return result;
    return result.filter((c) => c.category === args.category);
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/explore",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: clerkState.isSignedIn }),
  useClerk: () => ({ signOut: vi.fn() }),
  useUser: () => ({ isLoaded: true, user: null }),
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
    queryState.result = PUBLIC;
    queryState.calls = [];
    signInPassword.mockClear();
  });

  it("shows item details and no owner for logged-out visitors", () => {
    renderExplore();
    const main = screen.getByRole("main");
    const card = within(main)
      .getByRole("heading", { name: "Projector" })
      .closest("a")!;
    expect(card).toHaveAttribute("href", "/tools/id_Projector");
    expect(within(card).getByText("Projector description")).toBeVisible();
    expect(within(card).getByText("Electronics")).toBeVisible();
    expect(within(card).getByText("Like New")).toBeVisible();
    expect(within(main).queryByText("Marc S.")).not.toBeInTheDocument();
  });

  it("asks Convex for the selected category", () => {
    renderExplore();
    const main = screen.getByRole("main");
    fireEvent.click(
      within(main).getByRole("button", { name: "Garden & Outdoor" }),
    );
    expect(queryState.calls.at(-1)).toEqual({ category: "garden" });
    expect(
      within(main).getByRole("heading", { name: "Garden Tool Set" }),
    ).toBeInTheDocument();
    expect(
      within(main).queryByRole("heading", { name: "Projector" }),
    ).not.toBeInTheDocument();
  });

  it("shows the owner name and area when Convex returns member data", () => {
    clerkState.isSignedIn = true;
    queryState.result = MEMBER;
    renderExplore();
    const main = screen.getByRole("main");
    expect(within(main).getAllByText("Marc S.")).toHaveLength(2);
    expect(within(main).getAllByText("Patershol")).toHaveLength(2);
    expect(within(main).queryByText(/Building/)).not.toBeInTheDocument();
  });

  it("shows loading, empty and error states", () => {
    queryState.result = undefined;
    const { unmount } = renderExplore();
    expect(screen.getByRole("status", { name: "Loading tools" })).toBeVisible();
    unmount();

    queryState.result = [];
    const empty = renderExplore();
    expect(screen.getByText("Nothing shared here yet")).toBeVisible();
    empty.unmount();

    queryState.result = new Error("network down");
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderExplore();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn’t load the tools",
    );
    queryState.result = PUBLIC;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      within(screen.getByRole("main")).getByRole("heading", {
        name: "Projector",
      }),
    ).toBeInTheDocument();
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
