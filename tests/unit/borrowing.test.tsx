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
import type { IncomingRequest, MyRequest } from "@/features/loans/requestView";
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
  "loans:approve": vi.fn(async () => null),
  "loans:decline": vi.fn(async () => null),
  "loans:markReady": vi.fn(async () => null),
  "loans:confirmPickup": vi.fn(async () => null),
  "loans:markReturned": vi.fn(async () => null),
  "loans:confirmReturn": vi.fn(async () => null),
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
  declineReason: null,
  dueAt: null,
  pickupNote: null,
  history: [
    {
      from: null,
      to: "pending",
      by: "you",
      at: new Date(2026, 10, 28, 9, 5).getTime(),
      reason: null,
    },
  ],
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

const at = (hour: number, minute = 0) =>
  new Date(2026, 10, 28, hour, minute).getTime();

const incoming = (extra: Partial<IncomingRequest> = {}): IncomingRequest => ({
  id: "request_9" as Id<"borrowRequests">,
  status: "pending",
  startDate: "2026-12-01",
  endDate: "2026-12-04",
  message: "Hi! For a weekend project.",
  createdAt: at(9, 5),
  dueAt: null,
  cancelledBy: null,
  cancelReason: null,
  declineReason: null,
  history: [
    { from: null, to: "pending", by: "borrower", at: at(9, 5), reason: null },
  ],
  listing: {
    id: listingId,
    name: "Step Ladder",
    locationLabel: "Patershol, Gent",
    photo: null,
    active: true,
  },
  borrower: { profileId: "u_bruno", displayName: "Bruno M.", imageUrl: null },
  ...extra,
});

const detailOf = (name = "Step Ladder") =>
  screen.getByRole("region", { name: `${name} request` });
const actionLabels = () =>
  within(detailOf())
    .queryAllByRole("button")
    .map((b) => b.textContent?.trim());

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

  it("offers only Details and Cancel on a pending request", () => {
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
    expect(actions).not.toContain("View Pickup Details");
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

describe("Borrowing page: loan steps", () => {
  it("shows the pickup note and only the approximate area once approved", () => {
    state.queries["borrowRequests:mine"] = [
      mine({
        status: "approved",
        approvedAt: at(10),
        pickupNote: "Ring at the blue door after 6 pm.",
        history: [
          ...mine().history,
          {
            from: "pending",
            to: "approved",
            by: "owner",
            at: at(10),
            reason: null,
          },
        ],
      }),
    ];
    withAuth(<BorrowingScreen />);
    expect(actionLabels()).toEqual(
      expect.arrayContaining(["View Pickup Details", "Cancel Request"]),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View Pickup Details" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Pickup details" });
    expect(
      within(dialog).getByText("Patershol, Gent · approximate area"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Ring at the blue door after 6 pm."),
    ).toBeInTheDocument();
  });

  it("confirms pickup through Convex when the item is ready", async () => {
    state.queries["borrowRequests:mine"] = [
      mine({ status: "ready_for_pickup" }),
    ];
    withAuth(<BorrowingScreen />);
    expect(actionLabels()).toEqual(
      expect.arrayContaining(["Confirm Pickup", "Cancel Request"]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm Pickup" }));
    await waitFor(() =>
      expect(
        screen.getByText("Pickup confirmed · the loan has started."),
      ).toBeInTheDocument(),
    );
    expect(mutations["loans:confirmPickup"]).toHaveBeenCalledWith({
      id: "request_1",
    });
  });

  it("offers Mark as Returned on an overdue loan, never an extension", () => {
    state.queries["borrowRequests:mine"] = [mine({ status: "overdue" })];
    withAuth(<BorrowingScreen />);
    const labels = actionLabels();
    expect(labels).toContain("Mark as Returned");
    expect(labels).not.toContain("Request Extension");
    expect(labels).not.toContain("Cancel Request");
  });

  it("explains requests declined because the dates were taken", () => {
    state.queries["borrowRequests:mine"] = [
      mine({ status: "declined", declineReason: "dates_taken" }),
    ];
    withAuth(<BorrowingScreen />);
    expect(
      screen.getByText("These dates were given to another request."),
    ).toBeInTheDocument();
  });
});

describe("Lending page (Convex)", () => {
  it("shows the borrower, dates and message with Approve and Decline", () => {
    state.queries["loans:incoming"] = [incoming()];
    withAuth(<LendingScreen />);
    const detail = detailOf();
    expect(within(detail).getByText("Bruno M.")).toBeInTheDocument();
    expect(within(detail).getByText("Dec 1 – Dec 3, 2026")).toBeInTheDocument();
    expect(within(detail).getByText("Message from Bruno")).toBeInTheDocument();
    expect(
      within(detail).getByText("Hi! For a weekend project."),
    ).toBeInTheDocument();
    const labels = actionLabels();
    expect(labels).toEqual(expect.arrayContaining(["Approve", "Decline"]));
    // A pending request is declined, not cancelled, by the owner.
    expect(labels).not.toContain("Cancel Request");
  });

  it("approves with an optional pickup note", async () => {
    state.queries["loans:incoming"] = [incoming()];
    withAuth(<LendingScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    const dialog = screen.getByRole("dialog", { name: "Approve request" });
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "  Blue door, after 6 pm.  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(mutations["loans:approve"]).toHaveBeenCalledWith({
        id: "request_9",
        pickupNote: "Blue door, after 6 pm.",
      }),
    );
  });

  it("declines through Convex", async () => {
    state.queries["loans:incoming"] = [incoming()];
    withAuth(<LendingScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await waitFor(() =>
      expect(screen.getByText("Request declined.")).toBeInTheDocument(),
    );
    expect(mutations["loans:decline"]).toHaveBeenCalledWith({
      id: "request_9",
    });
  });

  it("marks an approved loan ready, and can cancel it", () => {
    state.queries["loans:incoming"] = [incoming({ status: "approved" })];
    withAuth(<LendingScreen />);
    const labels = actionLabels();
    expect(labels).toEqual(
      expect.arrayContaining(["Item ready for pickup", "Cancel Loan"]),
    );
    expect(labels).not.toContain("View Pickup Details");
  });

  it("lets the owner confirm a return directly from borrowed", async () => {
    state.queries["loans:incoming"] = [incoming({ status: "borrowed" })];
    withAuth(<LendingScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm Return" }));
    await waitFor(() =>
      expect(mutations["loans:confirmReturn"]).toHaveBeenCalledWith({
        id: "request_9",
      }),
    );
  });

  it("shows the server's reason when an action is refused", async () => {
    mutations["loans:approve"].mockRejectedValueOnce(
      new ConvexError({
        code: "DATES_UNAVAILABLE",
        message: "Those dates are already taken by another loan.",
      }),
    );
    state.queries["loans:incoming"] = [incoming()];
    withAuth(<LendingScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Approve request" })).getByRole(
        "button",
        { name: "Approve" },
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByText("Those dates are already taken by another loan."),
      ).toBeInTheDocument(),
    );
  });

  it("builds the timeline from the request history", () => {
    state.queries["loans:incoming"] = [
      incoming({
        status: "ready_for_pickup",
        history: [
          {
            from: null,
            to: "pending",
            by: "borrower",
            at: at(9, 5),
            reason: null,
          },
          {
            from: "pending",
            to: "approved",
            by: "you",
            at: at(10, 15),
            reason: null,
          },
          {
            from: "approved",
            to: "ready_for_pickup",
            by: "you",
            at: at(11, 30),
            reason: null,
          },
        ],
      }),
    ];
    withAuth(<LendingScreen />);
    const detail = detailOf();
    for (const time of ["Today · 09:05", "Today · 10:15", "Today · 11:30"]) {
      expect(within(detail).getByText(time)).toBeInTheDocument();
    }
  });
});
