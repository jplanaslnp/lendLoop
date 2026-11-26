import type { IconName } from "@/components/ui/Icon";
import type { TimelineStep } from "@/components/ui/Timeline";
import { LOAN_STATUS_STYLES } from "@/config/loanStatus";
import { diffDays, formatShort, parseIsoDate, pluralDays } from "@/lib/dates";
import { firstName, PEOPLE } from "@/mocks/people";
import type { LoanStatus, MockRequest } from "@/mocks/requests";
import { getTool } from "@/mocks/tools";

/**
 * UI presentation of a borrow request (banner, timeline, actions) — copied
 * from the Borrowing/Lending prototype. Pure functions; the lifecycle itself
 * is an open decision (docs/06, docs/DECISIONS.md) and is NOT enforced here.
 */

export type FilterKey =
  | "all"
  | "pending"
  | "approved"
  | "active"
  | "declined"
  | "returned"
  | "cancelled";

export const FILTERS: Record<FilterKey, readonly LoanStatus[] | null> = {
  all: null,
  pending: ["pending"],
  approved: ["approved", "ready"],
  active: ["borrowed", "overdue", "returnPending"],
  declined: ["declined"],
  returned: ["returned"],
  cancelled: ["cancelled"],
};

export type ActionType =
  | "approve"
  | "decline"
  | "ready"
  | "pickup"
  | "markReturned"
  | "confirmReturn"
  | "extension"
  | "details"
  | "address"
  | "cancel";

export type RequestAction =
  | {
      kind: "primary" | "secondary" | "ghost";
      label: string;
      type: ActionType;
      icon: IconName;
    }
  | { kind: "info"; label: string; status: LoanStatus; icon: IconName };

export type Banner = {
  title: string;
  text: string;
  status: LoanStatus;
  icon: IconName;
};

/** Number of completed timeline steps for each in-progress status. */
const DONE: Partial<Record<LoanStatus, number>> = {
  pending: 1,
  approved: 2,
  ready: 3,
  borrowed: 4,
  overdue: 4,
  returnPending: 4,
  returned: 5,
};

export function requestContext(request: MockRequest, today: Date) {
  const person = PEOPLE[request.personId];
  const first = firstName(person);
  const start = parseIsoDate(request.start);
  const end = parseIsoDate(request.end);
  const tool = getTool(request.itemId);
  return {
    person,
    first,
    start,
    end,
    endShort: formatShort(end),
    daysLeft: diffDays(today, end),
    itemName: tool?.name ?? request.itemId,
    isOwner: request.role === "received",
  };
}

export function getActions(request: MockRequest, today: Date): RequestAction[] {
  const { first, isOwner } = requestContext(request, today);
  const a = (
    kind: "primary" | "secondary" | "ghost",
    label: string,
    type: ActionType,
    icon: IconName,
  ): RequestAction => ({ kind, label, type, icon });
  const info = (
    label: string,
    status: LoanStatus,
    icon: IconName,
  ): RequestAction => ({
    kind: "info",
    label,
    status,
    icon,
  });
  const details = a("secondary", "See Product Details", "details", "info");
  const cancelRequest = a("ghost", "Cancel Request", "cancel", "ban");
  const cancelLoan = a("ghost", "Cancel Loan", "cancel", "ban");

  if (!isOwner) {
    const map: Record<LoanStatus, RequestAction[]> = {
      pending: [details, cancelRequest],
      approved: [
        a("primary", "View Pickup Address", "address", "pin"),
        details,
        cancelRequest,
      ],
      ready: [a("primary", "Confirm Pickup", "pickup", "hand"), cancelRequest],
      borrowed: [
        a("primary", "Mark as Returned", "markReturned", "returnArrow"),
        details,
      ],
      overdue: [
        a("primary", "Request Extension", "extension", "calendarPlus"),
        a("secondary", "Mark as Returned", "markReturned", "returnArrow"),
        details,
      ],
      returnPending: [
        info("Waiting for owner confirmation", "returnPending", "hourglass"),
      ],
      returned: [details],
      declined: [details],
      cancelled: [details],
    };
    return map[request.status];
  }
  const map: Partial<Record<LoanStatus, RequestAction[]>> = {
    pending: [
      a("primary", "Approve", "approve", "check"),
      a("secondary", "Decline", "decline", "x"),
      cancelRequest,
    ],
    approved: [
      a("primary", "Item ready for pickup", "ready", "box"),
      a("secondary", "View Pickup Address", "address", "pin"),
      cancelLoan,
    ],
    ready: [
      info(`Waiting for ${first} to confirm pickup`, "ready", "clock"),
      cancelLoan,
    ],
    returnPending: [a("primary", "Confirm Return", "confirmReturn", "check")],
  };
  return map[request.status] ?? [];
}

export function getBanner(request: MockRequest, today: Date): Banner {
  const { first, isOwner, endShort, daysLeft, itemName } = requestContext(
    request,
    today,
  );
  const item = itemName.toLowerCase();
  const by = request.cancelledBy === "you" ? "you" : first;
  const B = (status: LoanStatus, title: string, text: string): Banner => ({
    status,
    title,
    text,
    icon: LOAN_STATUS_STYLES[status].icon,
  });
  const left = `${pluralDays(daysLeft)} left`;
  const late = `${pluralDays(-daysLeft)} late`;
  const cancelled = B(
    "cancelled",
    `Cancelled by ${by}`,
    `${request.log.cancelled} · the reserved dates were released.`,
  );

  if (isOwner) {
    switch (request.status) {
      case "pending":
        return B(
          "pending",
          "New request",
          `${first} wants to borrow your ${item}. Approve or decline to let them know.`,
        );
      case "approved":
        return B(
          "approved",
          "Pickup coming up",
          `Meet ${first} at your pickup address. When you hand over the ${item}, tap Item ready for pickup.`,
        );
      case "ready":
        return B(
          "ready",
          "Waiting for pickup confirmation",
          `${first} has been notified. The loan starts only once ${first} confirms receipt.`,
        );
      case "borrowed":
        return B(
          "borrowed",
          "On loan",
          `With ${first} · due back ${endShort} (${left}).`,
        );
      case "overdue":
        return B(
          "overdue",
          "Overdue",
          `Was due back ${endShort} · ${late}. ${first} has been reminded.`,
        );
      case "returnPending":
        return B(
          "returnPending",
          "Confirm the return",
          `${first} marked the ${item} as returned. Confirm once you have it back.`,
        );
      case "returned":
        return B(
          "returned",
          "Loan completed",
          `Both of you confirmed the return on ${request.log.returned}.`,
        );
      case "declined":
        return B("declined", "Declined", "You declined this request.");
      case "cancelled":
        return cancelled;
    }
  }
  switch (request.status) {
    case "pending":
      return B(
        "pending",
        "Waiting for approval",
        `${first} hasn't responded yet. You'll be notified when they do.`,
      );
    case "approved":
      return B(
        "approved",
        "Request approved",
        `Pick up the ${item} from ${first} at the pickup address.`,
      );
    case "ready":
      return B(
        "ready",
        "Ready for pickup",
        `${first} marked the ${item} as ready. Confirm once it's in your hands — the loan starts when you confirm.`,
      );
    case "borrowed":
      return B(
        "borrowed",
        "On loan",
        `Return to ${first} by ${endShort} (${left}).`,
      );
    case "overdue":
      return B(
        "overdue",
        "Overdue",
        `Return was due ${endShort} · ${late}. Return it or request an extension.`,
      );
    case "returnPending":
      return B(
        "returnPending",
        "Waiting for owner confirmation",
        `You marked the ${item} as returned. ${first} needs to confirm receipt.`,
      );
    case "returned":
      return B(
        "returned",
        "Loan completed",
        `${first} confirmed the return on ${request.log.returned}.`,
      );
    case "declined":
      return B("declined", "Declined", `${first} declined this request.`);
    case "cancelled":
      return cancelled;
  }
}

export function getTimeline(request: MockRequest, today: Date): TimelineStep[] {
  const { first, isOwner, endShort } = requestContext(request, today);
  const base = [
    {
      key: "sent",
      title: isOwner ? "Request received" : "Request sent",
      todo: "",
    },
    {
      key: "approved",
      title: "Approved",
      todo: isOwner
        ? "Approve or decline the request"
        : `Waiting for ${first} to approve`,
    },
    {
      key: "ready",
      title: "Ready for pickup",
      todo: isOwner
        ? `Hand over the item to ${first}`
        : `Coordinate with ${first} to collect the item`,
    },
    {
      key: "pickedUp",
      title: "Picked up",
      todo: isOwner
        ? `${first} confirms receipt`
        : "Confirm once the item is in your hands",
    },
    { key: "returned", title: "Returned", todo: `Return by ${endShort}` },
  ] as const;

  if (request.status === "declined") {
    return [
      { title: base[0].title, subtitle: request.log.sent, kind: "done" },
      { title: "Declined", subtitle: request.log.declined, kind: "failed" },
    ];
  }
  if (request.status === "cancelled") {
    const n = (request.previousStatus && DONE[request.previousStatus]) || 1;
    return [
      ...base.slice(0, n).map((b): TimelineStep => ({
        title: b.title,
        subtitle: request.log[b.key],
        kind: "done",
      })),
      {
        title: `Cancelled by ${request.cancelledBy === "you" ? "you" : first}`,
        subtitle: `${request.log.cancelled} · dates released`,
        kind: "cancelled",
      },
    ];
  }
  const n = DONE[request.status] ?? 0;
  return base.map((b, i): TimelineStep => {
    if (i < n)
      return { title: b.title, subtitle: request.log[b.key], kind: "done" };
    if (i === n) {
      if (request.status === "ready") {
        return {
          title: "Pickup confirmation",
          subtitle: isOwner
            ? `Waiting for ${first} to confirm receipt`
            : "Tap Confirm Pickup once you have the item",
          kind: "yellow",
        };
      }
      if (request.status === "overdue")
        return {
          title: "Return overdue",
          subtitle: `Was due ${endShort}`,
          kind: "red",
        };
      if (request.status === "returnPending") {
        return {
          title: "Return pending",
          subtitle: isOwner
            ? `${first} marked it returned · ${request.log.returnMarked}`
            : `Waiting for owner confirmation · ${request.log.returnMarked}`,
          kind: "lavender",
        };
      }
      return { title: b.title, subtitle: b.todo, kind: "current" };
    }
    return { title: b.title, subtitle: b.todo, kind: "todo" };
  });
}

/** "Needs your action" hint shown on list cards. */
export function getNeedsHint(request: MockRequest): string | null {
  if (request.role === "received") {
    const map: Partial<Record<LoanStatus, string>> = {
      pending: "Respond to request",
      approved: "Mark ready at handover",
      returnPending: "Confirm return",
    };
    return map[request.status] ?? null;
  }
  const map: Partial<Record<LoanStatus, string>> = {
    ready: "Confirm pickup",
    overdue: "Return overdue",
  };
  return map[request.status] ?? null;
}

/** Status change + timeline log key applied by each mock action. */
export const ACTION_TRANSITIONS: Partial<
  Record<ActionType, { status: LoanStatus; logKey: keyof MockRequest["log"] }>
> = {
  approve: { status: "approved", logKey: "approved" },
  decline: { status: "declined", logKey: "declined" },
  ready: { status: "ready", logKey: "ready" },
  pickup: { status: "borrowed", logKey: "pickedUp" },
  markReturned: { status: "returnPending", logKey: "returnMarked" },
  confirmReturn: { status: "returned", logKey: "returned" },
};

export function actionToast(type: ActionType, first: string): string | null {
  switch (type) {
    case "approve":
      return `Request approved · ${first} has been notified.`;
    case "decline":
      return `Request declined · ${first} has been notified.`;
    case "ready":
      return `Marked ready · ${first} was notified to confirm pickup.`;
    case "pickup":
      return `Pickup confirmed · the loan has started. ${first} has been notified.`;
    case "markReturned":
      return `Marked as returned · waiting for ${first} to confirm.`;
    case "confirmReturn":
      return `Return confirmed · loan completed. ${first} has been notified.`;
    case "extension":
      return `Extension request sent to ${first}.`;
    default:
      return null;
  }
}
