import type { Doc } from "../_generated/dataModel";

/**
 * Loan lifecycle (Phase 8, docs/DECISIONS.md): which status changes exist,
 * from which statuses, and who may make them. Convex mutations use this
 * table; anything not listed here is refused.
 */
export type RequestStatus = Doc<"borrowRequests">["status"];
export type ActorRole = "borrower" | "owner" | "system";

export type TransitionName =
  | "approve"
  | "decline"
  | "markReady"
  | "confirmPickup"
  | "markReturned"
  | "confirmReturn"
  | "cancelByBorrower"
  | "cancelByOwner"
  | "markOverdue";

export const TRANSITIONS: Record<
  TransitionName,
  { from: readonly RequestStatus[]; to: RequestStatus; actor: ActorRole }
> = {
  approve: { from: ["pending"], to: "approved", actor: "owner" },
  decline: { from: ["pending"], to: "declined", actor: "owner" },
  markReady: { from: ["approved"], to: "ready_for_pickup", actor: "owner" },
  confirmPickup: {
    from: ["ready_for_pickup"],
    to: "borrowed",
    actor: "borrower",
  },
  markReturned: {
    from: ["borrowed", "overdue"],
    to: "return_pending",
    actor: "borrower",
  },
  confirmReturn: {
    from: ["borrowed", "overdue", "return_pending"],
    to: "returned",
    actor: "owner",
  },
  cancelByBorrower: {
    from: ["pending", "approved", "ready_for_pickup"],
    to: "cancelled",
    actor: "borrower",
  },
  cancelByOwner: {
    from: ["approved", "ready_for_pickup"],
    to: "cancelled",
    actor: "owner",
  },
  markOverdue: { from: ["borrowed"], to: "overdue", actor: "system" },
};

export function canTransition(
  name: TransitionName,
  from: RequestStatus,
): boolean {
  return TRANSITIONS[name].from.includes(from);
}

/** Statuses in which the borrower may read the owner's pickup note. */
export const PICKUP_NOTE_VISIBLE = new Set<RequestStatus>([
  "approved",
  "ready_for_pickup",
  "borrowed",
  "overdue",
  "return_pending",
  "returned",
]);
