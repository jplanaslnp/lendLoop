import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

import type { RequestStatus } from "./lifecycle";

/**
 * Writes to a request's append-only history (`requestEvents`). Every status
 * change goes through `applyTransition`, which patches the request and adds
 * the event in the same transaction. Nothing updates or deletes events.
 */
export type Actor =
  { role: "borrower" | "owner"; userId: Id<"users"> } | { role: "system" };

type Reason = NonNullable<Doc<"requestEvents">["reason"]>;
type RequestPatch = Partial<
  Omit<Doc<"borrowRequests">, "_id" | "_creationTime" | "status" | "updatedAt">
>;

function actorFields(actor: Actor) {
  return actor.role === "system"
    ? { actor: actor.role }
    : { actor: actor.role, actorId: actor.userId };
}

export async function recordCreated(
  ctx: MutationCtx,
  requestId: Id<"borrowRequests">,
  borrowerId: Id<"users">,
  at: number,
): Promise<void> {
  await ctx.db.insert("requestEvents", {
    requestId,
    from: null,
    to: "pending",
    ...actorFields({ role: "borrower", userId: borrowerId }),
    at,
  });
}

/** Changes the status and appends the matching history event. */
export async function applyTransition(
  ctx: MutationCtx,
  request: Doc<"borrowRequests">,
  to: RequestStatus,
  actor: Actor,
  options: { patch?: RequestPatch; reason?: Reason; at?: number } = {},
): Promise<void> {
  const at = options.at ?? Date.now();
  await ctx.db.patch(request._id, {
    ...options.patch,
    status: to,
    updatedAt: at,
  });
  await ctx.db.insert("requestEvents", {
    requestId: request._id,
    from: request.status,
    to,
    ...actorFields(actor),
    at,
    ...(options.reason ? { reason: options.reason } : {}),
  });
}
