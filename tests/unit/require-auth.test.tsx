import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuthUi } from "@/features/auth/AuthProvider";
import type { ListingDetail } from "@/features/listings/types";
import { ProductDetailsScreen } from "@/features/tools/ProductDetailsScreen";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Clerk's readiness and sign-in prompts (regression for Phase 7 e2e).
 *
 * A member whose short-lived session token expired gets a server render
 * that says "loaded, signed out". About half a second later Clerk's browser
 * script loads, refreshes the token and reports the member as signed in. A
 * click in that window must wait for the browser's answer: members get what
 * they asked for, genuine guests get the sign-in modal.
 */
const clerk = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    /** What `useAuth()` reports (first from the server render). */
    isLoaded: true,
    isSignedIn: false,
    /** `loaded`: Clerk's browser script has loaded and confirmed the session. */
    instance: {
      loaded: false,
      signOut: () => Promise.resolve(),
      addListener(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    listeners,
  };
});

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: clerk.isLoaded, isSignedIn: clerk.isSignedIn }),
  useClerk: () => clerk.instance,
  useUser: () => ({ isLoaded: clerk.isLoaded, user: null }),
  useSignIn: () => ({ signIn: {} }),
  useSignUp: () => ({ signUp: {} }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tools/listing_1",
  useSearchParams: () => new URLSearchParams(),
}));

const queries: Record<string, unknown> = {
  "listings:list": [],
  "borrowRequests:availability": [],
  "borrowRequests:forListing": { requestable: "yes", pending: [] },
};
vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) =>
    queries[getFunctionName(ref)],
  useMutation: () => vi.fn(),
}));

/** The server render: Clerk "loaded", signed out, browser script pending. */
function serverRender() {
  clerk.isLoaded = true;
  clerk.isSignedIn = false;
  clerk.instance.loaded = false;
}

/** Clerk's browser script loads and reports the real session. */
function browserLoads(signedIn: boolean, rerender: () => void) {
  act(() => {
    clerk.instance.loaded = true;
    clerk.isSignedIn = signedIn;
    clerk.listeners.forEach((listener) => listener());
  });
  rerender();
}

beforeEach(() => {
  serverRender();
  clerk.listeners.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 28, 12, 0));
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

const TOOL: ListingDetail = {
  id: "listing_1" as Id<"listings">,
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
};

const productPage = () => (
  <AuthProvider>
    <ProductDetailsScreen tool={TOOL} routeId="listing_1" />
  </AuthProvider>
);

/** Picks Dec 5 – Dec 6 and clicks "Request to borrow". */
function requestDates() {
  fireEvent.click(screen.getByRole("button", { name: /Select start date/ }));
  fireEvent.click(screen.getAllByRole("button", { name: "Dec 5" })[0]!);
  fireEvent.click(screen.getAllByRole("button", { name: "Dec 6" })[0]!);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Request to borrow" })[0]!,
  );
}

describe("Request to borrow while Clerk confirms the session", () => {
  it("opens the request dialog for a member, never the sign-in modal", () => {
    const view = render(productPage());
    requestDates();
    // Still waiting for the browser: nothing opens yet.
    expect(screen.queryByRole("dialog")).toBeNull();

    browserLoads(true, () => view.rerender(productPage()));
    expect(
      screen.getByRole("dialog", { name: "Confirm your request" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Welcome back" })).toBeNull();
  });

  it("still asks a genuinely signed-out visitor to sign in", () => {
    const view = render(productPage());
    requestDates();
    expect(screen.queryByRole("dialog")).toBeNull();

    browserLoads(false, () => view.rerender(productPage()));
    const signIn = screen.getByRole("dialog", { name: "Welcome back" });
    expect(within(signIn).getByLabelText("Email address")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Confirm your request" }),
    ).toBeNull();
  });

  it("acts at once when the browser has already confirmed the session", () => {
    clerk.instance.loaded = true;
    clerk.isSignedIn = true;
    render(productPage());
    requestDates();
    expect(
      screen.getByRole("dialog", { name: "Confirm your request" }),
    ).toBeInTheDocument();
  });
});

const action = vi.fn();

function Probe() {
  const { requireAuth, guardLink } = useAuthUi();
  return (
    <>
      <button type="button" onClick={() => requireAuth(action, "/tools/x")}>
        Needs sign-in
      </button>
      <a href="/borrowing" onClick={guardLink("/borrowing")}>
        Borrowing
      </a>
    </>
  );
}

const probe = () => (
  <AuthProvider>
    <Probe />
  </AuthProvider>
);

/** Clicks the account link; true when the guard stopped the navigation. */
const linkWasStopped = () =>
  // fireEvent returns false when a handler called preventDefault().
  !fireEvent.click(screen.getByRole("link", { name: "Borrowing" }));

describe("requireAuth and guardLink", () => {
  it("run the action once, after the browser confirms a member", () => {
    action.mockClear();
    const view = render(probe());
    fireEvent.click(screen.getByRole("button", { name: "Needs sign-in" }));
    expect(action).not.toHaveBeenCalled();
    browserLoads(true, () => view.rerender(probe()));
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("let links through before the browser confirms (proxy.ts gates them)", () => {
    render(probe());
    expect(linkWasStopped()).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stop signed-out visitors once Clerk has confirmed, as before", () => {
    clerk.instance.loaded = true;
    render(probe());
    expect(linkWasStopped()).toBe(true);
    expect(
      screen.getByRole("dialog", { name: "Welcome back" }),
    ).toBeInTheDocument();
  });

  it("let confirmed members through", () => {
    clerk.instance.loaded = true;
    clerk.isSignedIn = true;
    render(probe());
    expect(linkWasStopped()).toBe(false);
  });
});
