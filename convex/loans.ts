import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import {
  findBlockingConflict,
  historyDto,
  historyFor,
  requestsForListing,
  roleOf,
} from "./borrowRequests";
import { ownerDto, photosOf, toOwner } from "./listings";
import { getActiveMember, requireUser } from "./lib/auth";
import { applyTransition } from "./lib/history";
import {
  canTransition,
  TRANSITIONS,
  type TransitionName,
} from "./lib/lifecycle";
import {
  MESSAGE_MAX,
  normalizeMessage,
  rangesOverlap,
  startOfDayIn,
  todayIn,
} from "./lib/requestRules";
import { borrowStatusValidator } from "./schema";

/**
 * Loan lifecycle after the request (Phase 8, docs/DECISIONS.md): the owner
 * approves, declines, marks ready and confirms the return; the borrower
 * confirms pickup and marks the item returned; an hourly job marks overdue
 * loans. Every change is checked here against the caller's role and the
 * current status, and recorded in the append-only `requestEvents` history.
 * Arguments are only the request ID (and the optional pickup note): actor,
 * time and status always come from the server. Admins act as members.
 */

type LoanErrorCode =
  | "NOT_FOUND"
  | "NOT_ALLOWED"
  | "INVALID_TRANSITION"
  | "DATES_UNAVAILABLE"
  | "DATES_PASSED"
  | "UNAVAILABLE"
  | "INVALID";

function loanError(code: LoanErrorCode, message: string) {
  return new ConvexError({ code, message });
}

const TRANSITION_MESSAGES: Record<TransitionName, string> = {
  approve: "Only pending requests can be approved.",
  decline: "Only pending requests can be declined.",
  markReady: "Only approved loans can be marked ready for pickup.",
  confirmPickup: "Pickup can be confirmed once the item is ready.",
  markReturned: "Only items you have picked up can be marked as returned.",
  confirmReturn: "Only items that are on loan can be confirmed as returned.",
  cancelByBorrower: "This can no longer be cancelled.",
  cancelByOwner: "This can no longer be cancelled.",
  markOverdue: "Only active loans can become overdue.",
};

/**
 * Loads the request for `name` and checks, in this transaction, that the
 * caller has the role the transition needs and that the current status
 * allows it. Requests on demo listings or of demo owners never move.
 */
async function prepare(
  ctx: MutationCtx,
  id: Id<"borrowRequests">,
  name: TransitionName,
) {
  const user = await requireUser(ctx);
  const request = await ctx.db.get(id);
  const role = request ? await roleOf(ctx, request, user) : null;
  if (!request || !role) {
    throw loanError("NOT_FOUND", "This request doesn’t exist.");
  }
  const listing = await ctx.db.get(request.listingId);
  const owner = listing ? await ctx.db.get(listing.ownerId) : null;
  if (!listing || !owner) {
    throw loanError("NOT_FOUND", "This request doesn’t exist.");
  }
  if (listing.seedKey !== undefined || owner.seedKey !== undefined) {
    throw loanError("UNAVAILABLE", "Demo items can’t be borrowed.");
  }
  const { actor } = TRANSITIONS[name];
  if (role !== actor) {
    throw loanError(
      "NOT_ALLOWED",
      actor === "owner"
        ? "Only the owner can do this."
        : "Only the borrower can do this.",
    );
  }
  if (!canTransition(name, request.status)) {
    throw loanError("INVALID_TRANSITION", TRANSITION_MESSAGES[name]);
  }
  return { user, request, listing, role };
}

/**
 * Owner approves a pending request. Availability is re-checked inside this
 * mutation (`findBlockingConflict` reads every request of the listing, so a
 * concurrent approval makes Convex retry this one, which then sees it).
 * Other pending requests whose dates overlap are declined in the same
 * transaction (`dates_taken`, actor `system`).
 */
export const approve = mutation({
  args: { id: v.id("borrowRequests"), pickupNote: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { id, pickupNote }) => {
    const { user, request, listing } = await prepare(ctx, id, "approve");
    if (listing.status !== "active") {
      throw loanError("INVALID_TRANSITION", "This listing was removed.");
    }
    const note = normalizeMessage(pickupNote);
    if (note === null) {
      throw loanError(
        "INVALID",
        `Keep the pickup note to ${MESSAGE_MAX} characters of plain text.`,
      );
    }
    const now = Date.now();
    const today = todayIn(request.timeZone ?? "UTC", now);
    if (request.endDate <= today) {
      throw loanError("DATES_PASSED", "The requested dates have passed.");
    }
    const conflict = await findBlockingConflict(
      ctx,
      listing._id,
      request.startDate,
      request.endDate,
      request._id,
    );
    if (conflict) {
      throw loanError(
        "DATES_UNAVAILABLE",
        "Those dates are already taken by another loan.",
      );
    }

    await applyTransition(
      ctx,
      request,
      "approved",
      { role: "owner", userId: user._id },
      {
        patch: {
          approvedAt: now,
          approvedBy: user._id,
          ...(note ? { pickupNote: note } : {}),
        },
        at: now,
      },
    );
    for (const other of await requestsForListing(ctx, listing._id)) {
      if (
        other._id === request._id ||
        other.status !== "pending" ||
        !rangesOverlap(
          other.startDate,
          other.endDate,
          request.startDate,
          request.endDate,
        )
      ) {
        continue;
      }
      await applyTransition(
        ctx,
        other,
        "declined",
        { role: "system" },
        {
          patch: { declinedAt: now, declineReason: "dates_taken" },
          reason: "dates_taken",
          at: now,
        },
      );
    }
    return null;
  },
});

export const decline = mutation({
  args: { id: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { user, request } = await prepare(ctx, id, "decline");
    const now = Date.now();
    await applyTransition(
      ctx,
      request,
      "declined",
      { role: "owner", userId: user._id },
      { patch: { declinedAt: now, declinedBy: user._id }, at: now },
    );
    return null;
  },
});

export const markReady = mutation({
  args: { id: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { user, request } = await prepare(ctx, id, "markReady");
    const now = Date.now();
    await applyTransition(
      ctx,
      request,
      "ready_for_pickup",
      { role: "owner", userId: user._id },
      { patch: { readyAt: now }, at: now },
    );
    return null;
  },
});

/**
 * Borrower confirms they have the item; the loan starts. `dueAt` is the
 * beginning of `endDate` (the day after the last day of use) in the
 * borrower's stored time zone, computed here on the server.
 */
export const confirmPickup = mutation({
  args: { id: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { user, request } = await prepare(ctx, id, "confirmPickup");
    const now = Date.now();
    await applyTransition(
      ctx,
      request,
      "borrowed",
      { role: "borrower", userId: user._id },
      {
        patch: {
          pickedUpAt: now,
          dueAt: startOfDayIn(request.endDate, request.timeZone ?? "UTC"),
        },
        at: now,
      },
    );
    return null;
  },
});

export const markReturned = mutation({
  args: { id: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { user, request } = await prepare(ctx, id, "markReturned");
    await applyTransition(ctx, request, "return_pending", {
      role: "borrower",
      userId: user._id,
    });
    return null;
  },
});

/** Owner confirms the item is back (also directly from borrowed/overdue). */
export const confirmReturn = mutation({
  args: { id: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const { user, request } = await prepare(ctx, id, "confirmReturn");
    const now = Date.now();
    await applyTransition(
      ctx,
      request,
      "returned",
      { role: "owner", userId: user._id },
      { patch: { returnedAt: now }, at: now },
    );
    return null;
  },
});

const OVERDUE_BATCH = 100;

/**
 * Hourly (convex/crons.ts): borrowed loans whose `dueAt` has passed become
 * overdue. Idempotent: each loan's status is re-checked in this
 * transaction, so a loan already moved (or returned meanwhile) is skipped
 * and a second run writes nothing.
 */
export const markOverdueLoans = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("borrowRequests")
      .withIndex("by_status_and_dueAt", (q) =>
        q.eq("status", "borrowed").lte("dueAt", now),
      )
      .take(OVERDUE_BATCH);
    let moved = 0;
    for (const loan of due) {
      if (
        loan.dueAt === undefined ||
        !canTransition("markOverdue", loan.status)
      ) {
        continue;
      }
      await applyTransition(
        ctx,
        loan,
        "overdue",
        { role: "system" },
        { reason: "due_date_passed", at: now },
      );
      moved++;
    }
    if (due.length === OVERDUE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.loans.markOverdueLoans, {});
    }
    return moved;
  },
});

const INCOMING_LIMIT = 100;

const incomingDto = v.object({
  id: v.id("borrowRequests"),
  status: borrowStatusValidator,
  /** Half-open `[startDate, endDate)`. */
  startDate: v.string(),
  endDate: v.string(),
  message: v.union(v.string(), v.null()),
  createdAt: v.number(),
  dueAt: v.union(v.number(), v.null()),
  cancelledBy: v.union(v.literal("you"), v.literal("borrower"), v.null()),
  cancelReason: v.union(v.literal("listing_archived"), v.null()),
  declineReason: v.union(v.literal("dates_taken"), v.null()),
  history: v.array(historyDto),
  listing: v.object({
    id: v.id("listings"),
    name: v.string(),
    locationLabel: v.string(),
    photo: v.union(v.string(), v.null()),
    active: v.boolean(),
  }),
  /** Same members-only view as owners get: "Bruno M.", avatar. */
  borrower: ownerDto,
});

/**
 * Requests for the caller's own listings (Lending), newest first. Only
 * requests whose listing the caller still owns; [] when signed out. The
 * borrower is shown as members see each other: short name and avatar.
 */
export const incoming = query({
  args: {},
  returns: v.array(incomingDto),
  handler: async (ctx) => {
    const owner = await getActiveMember(ctx);
    if (!owner) return [];
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .order("desc")
      .take(INCOMING_LIMIT);

    const result = [];
    for (const r of requests) {
      const listing = await ctx.db.get(r.listingId);
      if (!listing || listing.ownerId !== owner._id) continue;
      const borrower = await ctx.db.get(r.borrowerId);
      const photos = await photosOf(ctx, listing);
      result.push({
        id: r._id,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        message: r.message ?? null,
        createdAt: r.createdAt,
        dueAt: r.dueAt ?? null,
        cancelledBy: cancelledByOf(r, owner._id),
        cancelReason: r.cancelReason ?? null,
        declineReason:
          r.declineReason === "dates_taken" ? ("dates_taken" as const) : null,
        history: await historyFor(ctx, r._id, owner._id),
        listing: {
          id: listing._id,
          name: listing.name,
          locationLabel: listing.locationLabel,
          photo: photos[0]?.src ?? null,
          active: listing.status === "active",
        },
        borrower: borrower
          ? toOwner(borrower)
          : { profileId: "", displayName: "Neighbour", imageUrl: null },
      });
    }
    return result;
  },
});

function cancelledByOf(
  r: Doc<"borrowRequests">,
  me: Id<"users">,
): "you" | "borrower" | null {
  if (r.cancelledBy === undefined) return null;
  return r.cancelledBy === me ? "you" : "borrower";
}

const BACKFILL_LIMIT = 500;

/**
 * One-off, idempotent history backfill for requests created before Phase 8
 * (run by an operator: `npx convex run loans:backfillHistory`). Only events
 * the stored data establishes are added, marked `backfilled: true`:
 * - creation, by the borrower, at `createdAt` (requests are only ever
 *   created by their borrower);
 * - a cancellation, when `cancelledAt` and `cancelledBy` are stored, from
 *   `pending` (the only cancellable status before Phase 8), with its reason.
 * Requests that already have history are skipped. Statuses, timestamps and
 * other fields are never changed, and nothing is deleted. Anything that
 * can't be established is left out and counted as `incomplete`.
 */
export const backfillHistory = internalMutation({
  args: {},
  returns: v.object({
    checked: v.number(),
    backfilled: v.number(),
    alreadyHadHistory: v.number(),
    incomplete: v.number(),
  }),
  handler: async (ctx) => {
    const requests = await ctx.db.query("borrowRequests").take(BACKFILL_LIMIT);
    let backfilled = 0;
    let alreadyHadHistory = 0;
    let incomplete = 0;
    for (const r of requests) {
      const existing = await ctx.db
        .query("requestEvents")
        .withIndex("by_request", (q) => q.eq("requestId", r._id))
        .first();
      if (existing) {
        alreadyHadHistory++;
        continue;
      }
      await ctx.db.insert("requestEvents", {
        requestId: r._id,
        from: null,
        to: "pending",
        actor: "borrower",
        actorId: r.borrowerId,
        at: r.createdAt,
        backfilled: true,
      });
      backfilled++;
      if (r.status === "pending") continue;

      const cancelActor =
        r.cancelledBy === r.borrowerId
          ? ("borrower" as const)
          : r.cancelledBy === r.ownerId
            ? ("owner" as const)
            : null;
      if (
        r.status === "cancelled" &&
        r.cancelledAt !== undefined &&
        r.cancelledBy !== undefined &&
        cancelActor
      ) {
        await ctx.db.insert("requestEvents", {
          requestId: r._id,
          from: "pending",
          to: "cancelled",
          actor: cancelActor,
          actorId: r.cancelledBy,
          at: r.cancelledAt,
          ...(r.cancelReason ? { reason: r.cancelReason } : {}),
          backfilled: true,
        });
      } else {
        incomplete++;
      }
    }
    return {
      checked: requests.length,
      backfilled,
      alreadyHadHistory,
      incomplete,
    };
  },
});
