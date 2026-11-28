import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/AuthProvider";
import { MyProfileScreen } from "@/features/profiles/MyProfileScreen";
import { EditListingScreen } from "@/features/share/EditListingScreen";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Convex and Clerk are mocked: these tests cover how the edit form and
 * My Profile render what `myListings.getForEdit` / `myListings.mine` return.
 * Ownership, archive and validation rules are enforced and tested in Convex
 * (tests/convex/myListings.test.ts).
 */
const state: {
  convexAuth: { isAuthenticated: boolean; isLoading: boolean };
  queries: Record<string, unknown>;
  queryArgs: Record<string, unknown>;
} = {
  convexAuth: { isAuthenticated: true, isLoading: false },
  queries: {},
  queryArgs: {},
};

const mutations = {
  "myListings:update": vi.fn(async () => null),
  "myListings:create": vi.fn(async () => null),
  "myListings:archive": vi.fn(async () => null),
};
const push = vi.fn();

vi.mock("convex/react", () => ({
  useConvexAuth: () => state.convexAuth,
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => {
    const name = getFunctionName(ref);
    state.queryArgs[name] = args;
    return args === "skip" ? undefined : state.queries[name];
  },
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) =>
    mutations[getFunctionName(ref) as keyof typeof mutations],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(),
}));

const mockClerk = vi.hoisted(() => ({
  signOut: vi.fn(),
  loaded: true,
  addListener: () => () => {},
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: vi.fn(async () => "token"),
  }),
  // Clerk's browser script has loaded (see AuthProvider's session check).
  useClerk: () => mockClerk,
  useUser: () => ({
    isLoaded: true,
    user: {
      firstName: "Qa",
      lastName: "Neighbour",
      primaryEmailAddress: { emailAddress: "qa@example.com" },
      imageUrl: "",
      createdAt: new Date(2026, 0, 5),
      update: vi.fn(),
    },
  }),
  useSignIn: () => ({ signIn: {} }),
  useSignUp: () => ({ signUp: {} }),
}));

const listingId = "listing_1" as Id<"listings">;
const EDITABLE = {
  id: listingId,
  name: "Step Ladder",
  category: "diy" as const,
  condition: "good" as const,
  description: "Aluminium step ladder, three steps.",
  area: "Patershol, Gent",
  photos: [
    { uploadId: "upload_1" as Id<"uploads">, src: "https://x.convex.cloud/a" },
    { uploadId: "upload_2" as Id<"uploads">, src: "https://x.convex.cloud/b" },
  ],
};

const myItem = (name: string, onLoan = false) => ({
  id: `id_${name}` as Id<"listings">,
  name,
  category: "garden" as const,
  mainPhoto: "https://x.convex.cloud/main",
  onLoan,
});

const withAuth = (ui: React.ReactNode) =>
  render(<AuthProvider>{ui}</AuthProvider>);

beforeEach(() => {
  state.convexAuth = { isAuthenticated: true, isLoading: false };
  state.queries = {};
  state.queryArgs = {};
  Object.values(mutations).forEach((m) => m.mockReset());
  push.mockReset();
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

describe("edit listing form", () => {
  it("waits for Convex auth before asking for the listing", () => {
    state.convexAuth = { isAuthenticated: false, isLoading: true };
    withAuth(<EditListingScreen listingId={listingId} />);
    expect(state.queryArgs["myListings:getForEdit"]).toBe("skip");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your listing…",
    );
  });

  it("shows not found when Convex returns nothing for this user", () => {
    state.queries["myListings:getForEdit"] = null;
    withAuth(<EditListingScreen listingId="someone-elses" />);
    expect(state.queryArgs["myListings:getForEdit"]).toEqual({
      id: "someone-elses",
    });
    expect(
      screen.getByText("This listing can’t be edited"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to your profile" }),
    ).toHaveAttribute("href", "/profile");
  });

  it("prefills every field and the existing photos", () => {
    state.queries["myListings:getForEdit"] = EDITABLE;
    withAuth(<EditListingScreen listingId={listingId} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Edit listing" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Item name/)).toHaveValue("Step Ladder");
    expect(screen.getByLabelText(/Category/)).toHaveValue("diy");
    expect(screen.getByRole("radio", { name: "Good" })).toBeChecked();
    expect(screen.getByLabelText(/Description/)).toHaveValue(
      "Aluminium step ladder, three steps.",
    );
    expect(screen.getByLabelText(/Area/)).toHaveValue("Patershol, Gent");
    // Photo tiles are CSS backgrounds (main photo first).
    const tiles = [...document.querySelectorAll<HTMLElement>("[style]")]
      .map((el) => el.style.backgroundImage.replaceAll('"', ""))
      .filter(Boolean);
    expect(tiles).toContain("url(https://x.convex.cloud/a)");
    expect(tiles).toContain("url(https://x.convex.cloud/b)");
    expect(
      screen.getByRole("button", { name: /Save changes/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("saves with the existing photo IDs and opens the product page", async () => {
    state.queries["myListings:getForEdit"] = EDITABLE;
    withAuth(<EditListingScreen listingId={listingId} />);

    fireEvent.change(screen.getByLabelText(/Item name/), {
      target: { value: "Step Ladder v2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/tools/listing_1"));
    expect(mutations["myListings:update"]).toHaveBeenCalledWith({
      id: listingId,
      name: "Step Ladder v2",
      category: "diy",
      condition: "good",
      description: "Aluminium step ladder, three steps.",
      area: "Patershol, Gent",
      photoIds: ["upload_1", "upload_2"],
    });
  });
});

describe("My Profile listings", () => {
  it("shows a loading state until Convex answers", () => {
    withAuth(<MyProfileScreen />);
    expect(screen.getByText("Loading your items…")).toBeInTheDocument();
  });

  it("shows the empty state when the member has no active listings", () => {
    state.queries["myListings:mine"] = [];
    withAuth(<MyProfileScreen />);
    expect(
      screen.getByText("You're not sharing anything yet"),
    ).toBeInTheDocument();
  });

  it("lists items with links to edit and view them", () => {
    state.queries["myListings:mine"] = [myItem("Hedge Trimmer")];
    withAuth(<MyProfileScreen />);

    expect(
      screen.getAllByRole("heading", { name: "Hedge Trimmer" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Garden & Outdoor").length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Actions for Hedge Trimmer" })[0]!,
    );
    expect(
      screen.getAllByRole("menuitem", { name: "Edit listing" })[0],
    ).toHaveAttribute("href", "/share/id_Hedge Trimmer");
    expect(
      screen.getAllByRole("menuitem", { name: "View in Explore" })[0],
    ).toHaveAttribute("href", "/tools/id_Hedge Trimmer");
  });

  it("does not offer removal while an item is on loan", () => {
    state.queries["myListings:mine"] = [myItem("Lawn Mower", true)];
    withAuth(<MyProfileScreen />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Actions for Lawn Mower" })[0]!,
    );
    expect(
      screen.getAllByRole("menuitem", {
        name: "Can’t remove while on loan",
      })[0],
    ).toBeDisabled();
  });

  it("archives through Convex and reports the result", async () => {
    state.queries["myListings:mine"] = [myItem("Hedge Trimmer")];
    withAuth(<MyProfileScreen />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Actions for Hedge Trimmer" })[0]!,
    );
    fireEvent.click(
      screen.getAllByRole("menuitem", { name: "Remove listing" })[0]!,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(
        screen.getByText("Hedge Trimmer removed from your listings."),
      ).toBeInTheDocument(),
    );
    expect(mutations["myListings:archive"]).toHaveBeenCalledWith({
      id: "id_Hedge Trimmer",
    });
  });

  it("shows the server's reason when archiving is refused", async () => {
    mutations["myListings:archive"].mockRejectedValueOnce(
      new ConvexError({
        code: "ON_LOAN",
        message: "This item is on loan and can’t be removed yet.",
      }),
    );
    state.queries["myListings:mine"] = [myItem("Hedge Trimmer")];
    withAuth(<MyProfileScreen />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Actions for Hedge Trimmer" })[0]!,
    );
    fireEvent.click(
      screen.getAllByRole("menuitem", { name: "Remove listing" })[0]!,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(
        screen.getByText("This item is on loan and can’t be removed yet."),
      ).toBeInTheDocument(),
    );
  });
});
