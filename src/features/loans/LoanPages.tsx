"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useMemo } from "react";

import { useLocalToday } from "@/lib/useLocalToday";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import type { ActionType } from "./loanPresentation";
import { LoansScreen } from "./LoansScreen";
import { fromIncoming, fromMyRequest, type LoanView } from "./requestView";

/** Placeholder before the browser's date is known (never displayed). */
const NOT_YET = new Date(0);

type Status = LoanView["status"];

/**
 * Which design actions are offered, per role and status. This mirrors the
 * lifecycle in convex/lib/lifecycle.ts for the UI only: Convex re-checks
 * the caller and the status on every action. Extensions are not in scope.
 */
const BORROWER_ACTIONS: Partial<Record<ActionType, readonly Status[]>> = {
  details: [
    "pending",
    "approved",
    "ready",
    "borrowed",
    "overdue",
    "returnPending",
    "returned",
    "declined",
    "cancelled",
  ],
  cancel: ["pending", "approved", "ready"],
  address: ["approved", "ready"],
  pickup: ["ready"],
  markReturned: ["borrowed", "overdue"],
};

const OWNER_ACTIONS: Partial<Record<ActionType, readonly Status[]>> = {
  approve: ["pending"],
  decline: ["pending"],
  ready: ["approved"],
  cancel: ["approved", "ready"],
  confirmReturn: ["borrowed", "overdue", "returnPending"],
};

const allowed =
  (table: Partial<Record<ActionType, readonly Status[]>>) =>
  (request: LoanView, type: ActionType) =>
    table[type]?.includes(request.status) ?? false;

/** A Convex error's message, or a generic one. */
function failure(error: unknown, fallback: string): Error {
  return new Error(
    error instanceof ConvexError
      ? ((error.data as { message?: string }).message ?? fallback)
      : fallback,
  );
}

function useToday(): Date {
  // Null while prerendering; requests only arrive in the browser anyway.
  return useLocalToday() ?? NOT_YET;
}

function useCancel() {
  const cancelRequest = useMutation(api.borrowRequests.cancel);
  return async (request: LoanView) => {
    try {
      await cancelRequest({ id: request.id as Id<"borrowRequests"> });
      return request.status === "pending"
        ? "Request cancelled."
        : "Loan cancelled · the dates were released.";
    } catch (error) {
      throw failure(error, "Couldn’t cancel. Please try again.");
    }
  };
}

/** Borrowing: the caller's own requests and loans from Convex. */
export function BorrowingScreen() {
  const mine = useQuery(api.borrowRequests.mine);
  const confirmPickup = useMutation(api.loans.confirmPickup);
  const markReturned = useMutation(api.loans.markReturned);
  const cancel = useCancel();
  const today = useToday();
  const requests = useMemo(
    () => mine?.map((r) => fromMyRequest(r, today)),
    [mine, today],
  );

  return (
    <LoansScreen
      role="sent"
      data={{
        requests,
        today,
        canAct: allowed(BORROWER_ACTIONS),
        onAction: async (request, type) => {
          const id = request.id as Id<"borrowRequests">;
          try {
            if (type === "pickup") {
              await confirmPickup({ id });
              return "Pickup confirmed · the loan has started.";
            }
            if (type === "markReturned") {
              await markReturned({ id });
              return `Marked as returned · waiting for ${request.person.first} to confirm.`;
            }
          } catch (error) {
            throw failure(error, "Couldn’t update the loan. Please try again.");
          }
          return null;
        },
        cancel,
      }}
    />
  );
}

/** Lending: requests for the caller's own listings from Convex. */
export function LendingScreen() {
  const incoming = useQuery(api.loans.incoming);
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReady = useMutation(api.loans.markReady);
  const confirmReturn = useMutation(api.loans.confirmReturn);
  const cancel = useCancel();
  const today = useToday();
  const requests = useMemo(
    () => incoming?.map((r) => fromIncoming(r, today)),
    [incoming, today],
  );

  return (
    <LoansScreen
      role="received"
      data={{
        requests,
        today,
        canAct: allowed(OWNER_ACTIONS),
        onAction: async (request, type, input) => {
          const id = request.id as Id<"borrowRequests">;
          try {
            switch (type) {
              case "approve":
                await approve({ id, pickupNote: input?.pickupNote });
                return `Request approved · ${request.person.first} can now see your pickup note.`;
              case "decline":
                await decline({ id });
                return "Request declined.";
              case "ready":
                await markReady({ id });
                return `Marked ready · waiting for ${request.person.first} to confirm pickup.`;
              case "confirmReturn":
                await confirmReturn({ id });
                return "Return confirmed · loan completed.";
              default:
                return null;
            }
          } catch (error) {
            throw failure(
              error,
              "Couldn’t update the request. Please try again.",
            );
          }
        },
        cancel,
      }}
    />
  );
}
