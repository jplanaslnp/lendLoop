import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/AuthProvider";
import type { ListingDetail } from "@/features/listings/types";
import { BorrowingScreen, LendingScreen } from "@/features/loans/LoanPages";
import type { MyRequest } from "@/features/loans/requestView";
import { ProductDetailsScreen } from "@/features/tools/ProductDetailsScreen";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Convex and Clerk are mocked: these tests cover how the product page and
 * Borrowing render what Convex returns, and what they send. The rules are
 * enforced and tested in Convex (tests/convex/borrowRequests.test.ts).
 */
const state: { queries: Record<string, unknown> } = { queries: {} };
const mutations = {
  "borrowRequests:create": vi.fn(async () => "request_1"),
  "borrowRequests:cancel": vi.fn(async () => null),
};

vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) =>
    args === "skip" ? undefined : state.queries[getFunctionName(ref)],
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) =>
    mutations[getFunctionName(ref) as keyof typeof mutations],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tools/listing_1",
  useSearchParams: () => new URLSearchParams(),
}));

const mockClerk = vi.hoisted(() => ({
  signOut: vi.fn(),
  loaded: true,
  addListener: () => () => {},
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
  // Clerk's browser script has loaded (see AuthProvider's session check).
  useClerk: () => mockClerk,
  useUser: () => ({ isLoaded: true, user: null }),
  useSignIn: () => ({ signIn: {} }),
  useSignUp: () => ({ signUp: {} }),
}));

const listingId = "listing_1" as Id<"listings">;
const TOOL: ListingDetail = {
  id: listingId,
  name: "Step Ladder",
  category: "diy",
  condition: "good",
  description: "Aluminium step ladder, three steps.",
  availability: "available",
  locationLabel: "Patershol, Gent",
  photos: [],
  longDescription: null,
  conditionNote: null,
  details: [],
  owner: { profileId: "u_marc", displayName: "Marc S.", imageUrl: null },
};

const withAuth = (ui: React.ReactNode) =>
  render(<AuthProvider>{ui}</AuthProvider>);

beforeEach(() => {
  // Today is Nov 28, 2026 for the calendar (only Date is faked).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 28, 12, 0));
  state.queries = {
    "listings:list": [],
    "borrowRequests:availability": [],
    "borrowRequests:forListing": { requestable: "yes", pending: [] },
  };
  Object.values(mutations).forEach((m) => m.mockClear());
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
afterEach(() => {
  vi.useRealTimers();
});

const renderProduct = () =>
  withAuth(<ProductDetailsScreen tool={TOOL} routeId={listingId} />);

const day = (label: string) =>
  screen.getAllByRole("button", { name: label })[0]!;

describe("product page request flow", () => {
  it("shows the owner their listing instead of the request button", () => {
    state.queries["borrowRequests:forListing"] = {
      requestable: "own",
      pending: [],
    };
    renderProduct();
    expect(screen.getAllByText("This is your listing").length).toBe(2);
    for (const link of screen.getAllByRole("link", { name: "Edit listing" })) {
      expect(link).toHaveAttribute("href", "/share/listing_1");
    }
    expect(
      screen.queryByRole("button", { name: "Request to borrow" }),
    ).toBeNull();
  });

  it("turns requests off for demo items", () => {
    state.queries["borrowRequests:forListing"] = {
      requestable: "demo",
      pending: [],
    };
    renderProduct();
    expect(
      screen.getAllByText("Demo item · requests are turned off").length,
    ).toBe(2);
    expect(
      screen.queryByRole("button", { name: "Request to borrow" }),
    ).toBeNull();
  });

  it("shows a pending request from Convex, which survives reloads", () => {
    state.queries["borrowRequests:forListing"] = {
      requestable: "yes",
      pending: [{ id: "r1", startDate: "2026-12-01", endDate: "2026-12-04" }],
    };
    renderProduct();
    expect(screen.getByText("Request sent · Pending")).toBeInTheDocument();
    expect(
      screen.getByText(/Dec 1 – Dec 3 · waiting for Marc\./),
    ).toBeInTheDocument();
  });

  it("crosses out booked days and blocks past days", () => {
    state.queries["borrowRequests:availability"] = [
      { startDate: "2026-12-02", endDate: "2026-12-04" },
    ];
    renderProduct();
    fireEvent.click(screen.getByRole("button", { name: /Select start date/ }));
    expect(day("Dec 2, unavailable")).toBeDisabled();
    expect(day("Dec 3, unavailable")).toBeDisabled();
    // Dec 4 is the day the booking ends: free.
    expect(day("Dec 4")).toBeEnabled();
    expect(day("Nov 27, past")).toBeDisabled();
    expect(day("Nov 28")).toBeEnabled();
  });

  it("sends the half-open range, time zone and a retry key", async () => {
    renderProduct();
    fireEvent.click(screen.getByRole("button", { name: /Select start date/ }));
    fireEvent.click(day("Dec 5"));
    fireEvent.click(day("Dec 6"));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Request to borrow" })[0]!,
    );
    const dialog = screen.getByRole("dialog", { name: "Confirm your request" });
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "  For a weekend project.  " },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Send request" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Request sent · waiting for the owner."),
      ).toBeInTheDocument(),
    );
    expect(mutations["borrowRequests:create"]).toHaveBeenCalledWith({
      listingId,
      startDate: "2026-12-05",
      endDate: "2026-12-07",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      message: "For a weekend project.",
      idempotencyKey: expect.stringMatching(/^[A-Za-z0-9-]{8,64}$/),
    });
  });

  it("keeps the dialog open with the server's reason when refused", async () => {
    mutations["borrowRequests:create"].mockRejectedValueOnce(
      new ConvexError({
        code: "DATES_UNAVAILABLE",
        message: "Those dates are already booked. Choose other dates.",
      }),
    );
    renderProduct();
    fireEvent.click(screen.getByRole("button", { name: /Select start date/ }));
    fireEvent.click(day("Dec 5"));
    fireEvent.click(day("Dec 5"));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Request to borrow" })[0]!,
    );
    const dialog = screen.getByRole("dialog", { name: "Confirm your request" });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Send request" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Those dates are already booked. Choose other dates.",
    );
    expect(mutations["borrowRequests:create"]).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: "2026-12-05",
        endDate: "2026-12-06",
      }),
    );
  });
});

const mine = (extra: Partial<MyRequest> = {}): MyRequest => ({
  id: "request_1" as Id<"borrowRequests">,
  status: "pending",
  startDate: "2026-12-01",
  endDate: "2026-12-04",
  message: null,
  createdAt: new Date(2026, 10, 28, 9, 5).getTime(),
  approvedAt: null,
  readyAt: null,
  pickedUpAt: null,
  returnedAt: null,
  declinedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancelReason: null,
  listing: {
    id: listingId,
    name: "Step Ladder",
    locationLabel: "Patershol, Gent",
    photo: null,
    active: true,
  },
  owner: { profileId: "u_olive", displayName: "Olive T.", imageUrl: null },
  ...extra,
});

describe("Borrowing page (Convex)", () => {
  it("shows a loading state, then the empty state", () => {
    const view = withAuth(<BorrowingScreen />);
    expect(screen.getByText("Loading your requests…")).toBeInTheDocument();
    state.queries["borrowRequests:mine"] = [];
    view.rerender(
      <AuthProvider>
        <BorrowingScreen />
      </AuthProvider>,
    );
    expect(screen.getByText("No requests here")).toBeInTheDocument();
  });

  it("shows a pending request with only the actions Phase 7 supports", () => {
    state.queries["borrowRequests:mine"] = [mine()];
    withAuth(<BorrowingScreen />);
    const detail = screen.getByRole("region", { name: "Step Ladder request" });
    expect(within(detail).getByText("Olive T.")).toBeInTheDocument();
    expect(
      within(detail).getByText("Waiting for approval"),
    ).toBeInTheDocument();
    // Stored [Dec 1, Dec 4) is shown as Dec 1 – Dec 3, 3 days.
    expect(within(detail).getByText("Dec 1 – Dec 3, 2026")).toBeInTheDocument();
    expect(within(detail).getByText("3 days")).toBeInTheDocument();
    expect(within(detail).getByText("Today · 09:05")).toBeInTheDocument();
    const actions = within(detail)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(actions).toEqual(
      expect.arrayContaining(["See Product Details", "Cancel Request"]),
    );
    expect(actions).not.toContain("View Pickup Address");
  });

  it("cancels a pending request through Convex", async () => {
    state.queries["borrowRequests:mine"] = [mine()];
    withAuth(<BorrowingScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel Request" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "Your request for Dec 1 – Dec 3 will be withdrawn. It stays in your history.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Yes, cancel request" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Request cancelled.")).toBeInTheDocument(),
    );
    expect(mutations["borrowRequests:cancel"]).toHaveBeenCalledWith({
      id: "request_1",
    });
  });

  it("explains requests cancelled because the listing was removed", () => {
    state.queries["borrowRequests:mine"] = [
      mine({
        status: "cancelled",
        cancelledBy: "owner",
        cancelReason: "listing_archived",
        cancelledAt: new Date(2026, 10, 28, 10, 0).getTime(),
        listing: { ...mine().listing, active: false },
      }),
    ];
    withAuth(<BorrowingScreen />);
    expect(screen.getByText("Listing removed")).toBeInTheDocument();
    expect(screen.getByText("Cancelled · listing removed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel Request" })).toBeNull();
  });
});

describe("Lending page (mock until Phase 8)", () => {
  it("still renders the design's mock requests and actions", () => {
    withAuth(<LendingScreen />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Lending" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });
});
