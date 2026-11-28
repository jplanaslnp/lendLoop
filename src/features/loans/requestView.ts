import type { FunctionReturnType } from "convex/server";

import { formatLogTime } from "@/lib/dates";
import { avatarSrc, firstName, PEOPLE } from "@/mocks/people";
import type {
  LoanStatus,
  MockRequest,
  RequestLogKey,
  RequestRole,
} from "@/mocks/requests";
import { getTool } from "@/mocks/tools";
import type { api } from "@convex/_generated/api";
import { addIsoDays } from "@convex/lib/requestRules";

/**
 * What the Borrowing/Lending screens display for one request. Borrowing is
 * built from Convex (`borrowRequests.mine`, Phase 7); Lending still uses the
 * Phase 2 mock data until Phase 8. Dates are inclusive here (`end` is the
 * last day of use), as the design shows them.
 */
export type LoanView = {
  id: string;
  role: RequestRole;
  status: LoanStatus;
  /** For cancelled requests: the status before cancellation. */
  previousStatus?: LoanStatus;
  cancelledBy?: "you" | "them";
  cancelReason?: "listing_archived";
  /** First and last day of use, `YYYY-MM-DD`. */
  start: string;
  end: string;
  log: Partial<Record<RequestLogKey, string>>;
  item: { name: string; photo: string | null; routeId: string };
  /** The other party: the owner on Borrowing, the borrower on Lending. */
  person: {
    profileId: string;
    first: string;
    shortName: string;
    /** Name in the detail panel (members only see "Marc S." for owners). */
    name: string;
    avatar: string | null;
    /** Card line next to the name (area or mock building). */
    place: string;
    /** Pickup area line in the detail panel. */
    pickupArea: string;
  };
};

/** Phase 2 mock request (Lending) as a view. */
export function fromMock(request: MockRequest): LoanView {
  const person = PEOPLE[request.personId];
  return {
    id: request.id,
    role: request.role,
    status: request.status,
    previousStatus: request.previousStatus,
    cancelledBy: request.cancelledBy,
    start: request.start,
    end: request.end,
    log: request.log,
    item: {
      name: getTool(request.itemId)?.name ?? request.itemId,
      photo: `/images/tools/${request.itemId}.jpg`,
      routeId: request.itemId,
    },
    person: {
      profileId: person.id,
      first: firstName(person),
      shortName: person.shortName,
      name: person.fullName,
      avatar: avatarSrc(person.id),
      place: person.building,
      pickupArea: `${person.building} · Gent`,
    },
  };
}

export type MyRequest = FunctionReturnType<
  typeof api.borrowRequests.mine
>[number];

const STATUS: Record<MyRequest["status"], LoanStatus> = {
  pending: "pending",
  approved: "approved",
  ready_for_pickup: "ready",
  borrowed: "borrowed",
  overdue: "overdue",
  return_pending: "returnPending",
  returned: "returned",
  declined: "declined",
  cancelled: "cancelled",
};

/** A Convex request the caller sent (Borrowing) as a view. */
export function fromMyRequest(request: MyRequest, now: Date): LoanView {
  const time = (ms: number | null) =>
    ms === null ? undefined : formatLogTime(new Date(ms), now);
  const owner = request.owner;
  const log: LoanView["log"] = {
    sent: time(request.createdAt),
    approved: time(request.approvedAt),
    ready: time(request.readyAt),
    pickedUp: time(request.pickedUpAt),
    returned: time(request.returnedAt),
    declined: time(request.declinedAt),
    cancelled: time(request.cancelledAt),
  };
  return {
    id: request.id,
    role: "sent",
    status: STATUS[request.status],
    // Phase 7 only cancels pending requests.
    previousStatus: request.status === "cancelled" ? "pending" : undefined,
    cancelledBy:
      request.cancelledBy === "you"
        ? "you"
        : request.cancelledBy === "owner"
          ? "them"
          : undefined,
    cancelReason: request.cancelReason ?? undefined,
    start: request.startDate,
    end: addIsoDays(request.endDate, -1),
    log: Object.fromEntries(
      Object.entries(log).filter(([, value]) => value !== undefined),
    ),
    item: {
      name: request.listing.name,
      photo: request.listing.photo,
      routeId: request.listing.id,
    },
    person: {
      profileId: owner.profileId,
      first: owner.displayName.split(" ")[0] ?? owner.displayName,
      shortName: owner.displayName,
      name: owner.displayName,
      avatar: owner.imageUrl,
      place: request.listing.locationLabel,
      pickupArea: request.listing.locationLabel,
    },
  };
}
