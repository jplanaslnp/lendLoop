"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useMemo, useState } from "react";

import { useLocalToday } from "@/lib/useLocalToday";
import { MOCK_TODAY } from "@/mocks/people";
import { MOCK_REQUESTS } from "@/mocks/requests";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import {
  ACTION_TRANSITIONS,
  actionToast,
  requestContext,
  type ActionType,
} from "./loanPresentation";
import { LoansScreen } from "./LoansScreen";
import { fromMock, fromMyRequest, type LoanView } from "./requestView";

/** Phase 7 Borrowing offers only these; the rest arrive with Phase 8. */
const BORROWING_ACTIONS: ReadonlySet<ActionType> = new Set([
  "details",
  "cancel",
]);

/** Placeholder before the browser's date is known (never displayed). */
const NOT_YET = new Date(0);

/** Borrowing: the caller's own requests from Convex. */
export function BorrowingScreen() {
  const mine = useQuery(api.borrowRequests.mine);
  const cancelRequest = useMutation(api.borrowRequests.cancel);
  // Null while prerendering; requests only arrive in the browser anyway.
  const today = useLocalToday() ?? NOT_YET;
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
        allowedActions: BORROWING_ACTIONS,
        onAction: () => null,
        cancel: async (request) => {
          try {
            await cancelRequest({ id: request.id as Id<"borrowRequests"> });
            return "Request cancelled.";
          } catch (error) {
            throw new Error(
              error instanceof ConvexError
                ? ((error.data as { message?: string }).message ??
                    "Couldn’t cancel the request.")
                : "Couldn’t cancel the request. Please try again.",
            );
          }
        },
      }}
    />
  );
}

function nowLabel(): string {
  const d = new Date();
  return `Today · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Lending: Phase 2 mock requests, changed in memory only (until Phase 8). */
export function LendingScreen() {
  const [requests, setRequests] = useState<LoanView[]>(() =>
    MOCK_REQUESTS.filter((r) => r.role === "received").map((r) =>
      fromMock({ ...r, log: { ...r.log } }),
    ),
  );

  const update = (
    id: string,
    patch: Partial<LoanView>,
    logKey?: keyof LoanView["log"],
  ) =>
    setRequests((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              log: logKey ? { ...r.log, [logKey]: nowLabel() } : r.log,
            }
          : r,
      ),
    );

  return (
    <LoansScreen
      role="received"
      data={{
        requests,
        today: MOCK_TODAY,
        onAction: (request, type) => {
          const transition = ACTION_TRANSITIONS[type];
          if (transition) {
            update(
              request.id,
              { status: transition.status },
              transition.logKey,
            );
          }
          return actionToast(type, requestContext(request, MOCK_TODAY).first);
        },
        cancel: async (request) => {
          update(
            request.id,
            {
              status: "cancelled",
              previousStatus: request.status,
              cancelledBy: "you",
            },
            "cancelled",
          );
          return `Cancelled · ${request.person.first} has been notified and the dates were released.`;
        },
      }}
    />
  );
}
