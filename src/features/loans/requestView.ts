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
 * What the Borrowing/Lending screens display for one request, built from
 * Convex: `borrowRequests.mine` (Borrowing) and `loans.incoming` (Lending).
 * `fromMock` keeps the design's sample requests for UI copy tests. Dates
 * are inclusive here (`end` is the last day of use), as the design shows.
 */
export type LoanView = {
  id: string;
  role: RequestRole;
  status: LoanStatus;
  /** For cancelled requests: the status before cancellation. */
  previousStatus?: LoanStatus;
  cancelledBy?: "you" | "them";
  cancelReason?: "listing_archived";
  /** Declined automatically because another request got the dates. */
  declineReason?: "dates_taken";
  /** The borrower's optional message to the owner. */
  message?: string | null;
  /**
   * The owner's pickup note (Borrowing only, once approved). Never an
   * exact address: none is stored.
   */
  pickupNote?: string | null;
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
export type IncomingRequest = FunctionReturnType<
  typeof api.loans.incoming
>[number];
type ConvexStatus = MyRequest["status"];

const STATUS: Record<ConvexStatus, LoanStatus> = {
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

/** Timeline step recorded by a transition to each status. */
const LOG_KEY: Partial<Record<ConvexStatus, RequestLogKey>> = {
  pending: "sent",
  approved: "approved",
  ready_for_pickup: "ready",
  borrowed: "pickedUp",
  return_pending: "returnMarked",
  returned: "returned",
  declined: "declined",
  cancelled: "cancelled",
};

type ConvexRequest = MyRequest | IncomingRequest;

/**
 * Timeline times from the request's history (Phase 8), falling back to the
 * stored timestamps for steps that have no event.
 */
function logOf(request: ConvexRequest, now: Date): LoanView["log"] {
  const time = (ms: number | null | undefined) =>
    ms == null ? undefined : formatLogTime(new Date(ms), now);
  const log: LoanView["log"] = {};
  for (const event of request.history) {
    const key = LOG_KEY[event.to];
    if (key) log[key] = time(event.at);
  }
  log.sent ??= time(request.createdAt);
  if ("approvedAt" in request) {
    log.approved ??= time(request.approvedAt);
    log.ready ??= time(request.readyAt);
    log.pickedUp ??= time(request.pickedUpAt);
    log.returned ??= time(request.returnedAt);
    log.declined ??= time(request.declinedAt);
    log.cancelled ??= time(request.cancelledAt);
  }
  return Object.fromEntries(
    Object.entries(log).filter(([, value]) => value !== undefined),
  );
}

/** The status a cancelled request had just before it was cancelled. */
function statusBeforeCancel(request: ConvexRequest): LoanStatus | undefined {
  if (request.status !== "cancelled") return undefined;
  const event = request.history.findLast((e) => e.to === "cancelled");
  return event?.from ? STATUS[event.from] : "pending";
}

function base(
  request: ConvexRequest,
  now: Date,
): Omit<LoanView, "role" | "person" | "cancelledBy"> {
  return {
    id: request.id,
    status: STATUS[request.status],
    previousStatus: statusBeforeCancel(request),
    cancelReason: request.cancelReason ?? undefined,
    declineReason: request.declineReason ?? undefined,
    message: request.message,
    start: request.startDate,
    end: addIsoDays(request.endDate, -1),
    log: logOf(request, now),
    item: {
      name: request.listing.name,
      photo: request.listing.photo,
      routeId: request.listing.id,
    },
  };
}

function personOf(
  who: { profileId: string; displayName: string; imageUrl: string | null },
  area: string,
): LoanView["person"] {
  return {
    profileId: who.profileId,
    first: who.displayName.split(" ")[0] ?? who.displayName,
    shortName: who.displayName,
    name: who.displayName,
    avatar: who.imageUrl,
    place: area,
    pickupArea: area,
  };
}

/** A Convex request the caller sent (Borrowing) as a view. */
export function fromMyRequest(request: MyRequest, now: Date): LoanView {
  return {
    ...base(request, now),
    role: "sent",
    cancelledBy:
      request.cancelledBy === "you"
        ? "you"
        : request.cancelledBy === "owner"
          ? "them"
          : undefined,
    pickupNote: request.pickupNote,
    person: personOf(request.owner, request.listing.locationLabel),
  };
}

/** A Convex request for one of the caller's listings (Lending) as a view. */
export function fromIncoming(request: IncomingRequest, now: Date): LoanView {
  return {
    ...base(request, now),
    role: "received",
    cancelledBy:
      request.cancelledBy === "you"
        ? "you"
        : request.cancelledBy === "borrower"
          ? "them"
          : undefined,
    person: personOf(request.borrower, request.listing.locationLabel),
  };
}
