import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { ownerDto, photosOf, toOwner, visibleOwner } from "./listings";
import { getActiveMember, requireUser } from "./lib/auth";
import { applyTransition, recordCreated } from "./lib/history";
import { canTransition, PICKUP_NOTE_VISIBLE } from "./lib/lifecycle";
import {
  BLOCKING_STATUSES,
  checkRequestDates,
  DATE_PROBLEM_MESSAGES,
  isIdempotencyKey,
  MESSAGE_MAX,
  normalizeMessage,
  PENDING_REQUESTS_MAX,
  rangesOverlap,
} from "./lib/requestRules";
import {
  borrowStatusValidator,
  requestActorValidator,
  requestReasonValidator,
} from "./schema";

/**
 * Borrow requests, borrower side (Phase 7): create a pending request,
 * cancel your own pending request, list your requests, and the product
 * page's availability. The borrower is always the signed-in member from the
 * verified Clerk token; the owner is always copied from the listing.
 *
 * Availability (docs/06, approved for Phase 7): only approved and active
 * loans hold dates; pending requests may overlap. Approval (Phase 8) must
 * re-check `findBlockingConflict` inside its own transaction.
 */

type RequestErrorCode =
  | "INVALID"
  | "INVALID_DATES"
  | "NOT_FOUND"
  | "OWN_LISTING"
  | "UNAVAILABLE"
  | "DATES_UNAVAILABLE"
  | "DUPLICATE"
  | "LIMIT_REACHED"
  | "NOT_CANCELLABLE";

function requestError(code: RequestErrorCode, message: string) {
  return new ConvexError({ code, message });
}

const BLOCKING = new Set<Doc<"borrowRequests">["status"]>(BLOCKING_STATUSES);
/** Requests the borrower still has open (they count as duplicates). */
const OPEN = new Set<Doc<"borrowRequests">["status"]>([
  "pending",
  ...BLOCKING_STATUSES,
]);

/**
 * Every request on a listing. Reading the whole `by_listing` range puts it
 * in the mutation's read set, so a request committed concurrently on the
 * same listing makes Convex retry this mutation, which then sees it. That
 * keeps "check availability, then insert" atomic.
 */
export async function requestsForListing(
  ctx: QueryCtx,
  listingId: Id<"listings">,
): Promise<Doc<"borrowRequests">[]> {
  return ctx.db
    .query("borrowRequests")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .collect();
}

/**
 * The first approved/active loan on the listing that overlaps
 * `[startDate, endDate)`, ignoring `excludeId`. For Phase 8, approval calls
 * this in the same mutation that changes the status.
 */
export async function findBlockingConflict(
  ctx: QueryCtx,
  listingId: Id<"listings">,
  startDate: string,
  endDate: string,
  excludeId?: Id<"borrowRequests">,
): Promise<Doc<"borrowRequests"> | null> {
  const requests = await requestsForListing(ctx, listingId);
  return (
    requests.find(
      (r) =>
        r._id !== excludeId &&
        BLOCKING.has(r.status) &&
        rangesOverlap(r.startDate, r.endDate, startDate, endDate),
    ) ?? null
  );
}

type Requestability = "yes" | "own" | "demo" | "unavailable";

/**
 * Whether `member` may request this listing. Demo listings (development
 * seed data) are never requestable: their fictional owners can't sign in to
 * answer, so a request would stay pending forever.
 */
async function requestabilityOf(
  ctx: QueryCtx,
  listing: Doc<"listings"> | null,
  member: Doc<"users"> | null,
): Promise<{ status: Requestability; owner: Doc<"users"> | null }> {
  if (!listing || listing.status !== "active") {
    return { status: "unavailable", owner: null };
  }
  const owner = await visibleOwner(ctx, listing);
  if (!owner) return { status: "unavailable", owner: null };
  if (listing.seedKey !== undefined || owner.seedKey !== undefined) {
    return { status: "demo", owner };
  }
  if (member && owner._id === member._id) return { status: "own", owner };
  return { status: "yes", owner };
}

export const create = mutation({
  args: {
    listingId: v.id("listings"),
    startDate: v.string(),
    endDate: v.string(),
    timeZone: v.string(),
    message: v.optional(v.string()),
    idempotencyKey: v.string(),
  },
  returns: v.id("borrowRequests"),
  handler: async (ctx, args) => {
    const borrower = await requireUser(ctx);
    if (!isIdempotencyKey(args.idempotencyKey)) {
      throw requestError("INVALID", "Please try sending the request again.");
    }

    const listing = await ctx.db.get(args.listingId);
    const { status } = await requestabilityOf(ctx, listing, borrower);
    if (!listing || status === "unavailable") {
      throw requestError("NOT_FOUND", "This item is no longer available.");
    }
    if (status === "demo") {
      throw requestError(
        "UNAVAILABLE",
        "Demo items can’t be borrowed. Try an item shared by a neighbour.",
      );
    }
    if (status === "own") {
      throw requestError("OWN_LISTING", "You can’t borrow your own item.");
    }

    const requests = await requestsForListing(ctx, listing._id);

    // A retry of a request that already went through returns it.
    const retried = requests.find(
      (r) =>
        r.borrowerId === borrower._id &&
        r.idempotencyKey === args.idempotencyKey,
    );
    if (retried) {
      if (
        retried.startDate !== args.startDate ||
        retried.endDate !== args.endDate
      ) {
        throw requestError("INVALID", "Please try sending the request again.");
      }
      return retried._id;
    }

    const dates = checkRequestDates(args, Date.now());
    if (!dates.ok) {
      throw requestError("INVALID_DATES", DATE_PROBLEM_MESSAGES[dates.problem]);
    }
    const message = normalizeMessage(args.message);
    if (message === null) {
      throw requestError(
        "INVALID",
        `Keep your message to ${MESSAGE_MAX} characters of plain text.`,
      );
    }

    const overlaps = (r: Doc<"borrowRequests">) =>
      rangesOverlap(r.startDate, r.endDate, dates.startDate, dates.endDate);
    if (requests.some((r) => BLOCKING.has(r.status) && overlaps(r))) {
      throw requestError(
        "DATES_UNAVAILABLE",
        "Those dates are already booked. Choose other dates.",
      );
    }
    if (
      requests.some(
        (r) =>
          r.borrowerId === borrower._id && OPEN.has(r.status) && overlaps(r),
      )
    ) {
      throw requestError(
        "DUPLICATE",
        "You already have a request for these dates.",
      );
    }

    const pending = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower_and_status", (q) =>
        q.eq("borrowerId", borrower._id).eq("status", "pending"),
      )
      .take(PENDING_REQUESTS_MAX);
    if (pending.length >= PENDING_REQUESTS_MAX) {
      throw requestError(
        "LIMIT_REACHED",
        `You can have up to ${PENDING_REQUESTS_MAX} open requests. Cancel one to send another.`,
      );
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("borrowRequests", {
      listingId: listing._id,
      ownerId: listing.ownerId,
      borrowerId: borrower._id,
      startDate: dates.startDate,
      endDate: dates.endDate,
      timeZone: dates.timeZone,
      ...(message ? { message } : {}),
      status: "pending",
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
    await recordCreated(ctx, requestId, borrower._id, now);
    return requestId;
  },
});

/**
 * The caller's part in a request: its borrower, or the owner of its listing
 * (the stored owner must still match the listing). Null for anyone else,
 * admins included (Phase 8: admins act only as members).
 */
export async function roleOf(
  ctx: QueryCtx,
  request: Doc<"borrowRequests">,
  user: Doc<"users">,
): Promise<"borrower" | "owner" | null> {
  if (request.borrowerId === user._id) return "borrower";
  if (request.ownerId !== user._id) return null;
  const listing = await ctx.db.get(request.listingId);
  return listing?.ownerId === user._id ? "owner" : null;
}

/**
 * Cancels a request before pickup (Phase 8): the borrower while it is
 * pending, approved or ready for pickup; the owner once it is approved or
 * ready (a pending request is declined instead). Never after pickup: the
 * item then follows the return flow.
 */
export const cancel = mutation({
  args: { id: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(id);
    const role = request ? await roleOf(ctx, request, user) : null;
    if (!request || !role) {
      throw requestError("NOT_FOUND", "This request doesn’t exist.");
    }
    const allowed = canTransition(
      role === "borrower" ? "cancelByBorrower" : "cancelByOwner",
      request.status,
    );
    if (!allowed) {
      throw requestError(
        "NOT_CANCELLABLE",
        role === "owner" && request.status === "pending"
          ? "Decline the request instead."
          : "This can no longer be cancelled.",
      );
    }
    const now = Date.now();
    await applyTransition(
      ctx,
      request,
      "cancelled",
      { role, userId: user._id },
      { patch: { cancelledAt: now, cancelledBy: user._id }, at: now },
    );
    return null;
  },
});

/**
 * Called when the owner archives a listing (convex/myListings.ts): every
 * pending request on it is cancelled with reason `listing_archived`.
 */
export async function cancelPendingForArchivedListing(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  ownerId: Id<"users">,
  now: number,
): Promise<void> {
  for (const request of await requestsForListing(ctx, listingId)) {
    if (request.status !== "pending") continue;
    await applyTransition(
      ctx,
      request,
      "cancelled",
      { role: "owner", userId: ownerId },
      {
        patch: {
          cancelledAt: now,
          cancelledBy: ownerId,
          cancelReason: "listing_archived",
        },
        reason: "listing_archived",
        at: now,
      },
    );
  }
}

const rangeDto = v.object({ startDate: v.string(), endDate: v.string() });

/**
 * Booked date ranges for the product calendar (public). Dates only: no
 * borrower, status or IDs. Empty for listings that aren't active.
 */
export const availability = query({
  args: { listingId: v.id("listings") },
  returns: v.array(rangeDto),
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing || listing.status !== "active") return [];
    return (await requestsForListing(ctx, listingId))
      .filter((r) => BLOCKING.has(r.status))
      .map((r) => ({ startDate: r.startDate, endDate: r.endDate }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
});

/**
 * What the product page needs about the caller and this listing: whether
 * they may request it, and their own pending requests on it. Guests only
 * learn whether the item is a demo item.
 */
export const forListing = query({
  args: { listingId: v.id("listings") },
  returns: v.object({
    requestable: v.union(
      v.literal("yes"),
      v.literal("own"),
      v.literal("demo"),
      v.literal("unavailable"),
    ),
    pending: v.array(
      v.object({
        id: v.id("borrowRequests"),
        startDate: v.string(),
        endDate: v.string(),
      }),
    ),
  }),
  handler: async (ctx, { listingId }) => {
    const member = await getActiveMember(ctx);
    const listing = await ctx.db.get(listingId);
    const { status } = await requestabilityOf(ctx, listing, member);
    if (!member || status !== "yes") {
      return { requestable: status, pending: [] };
    }
    const pending = (await requestsForListing(ctx, listingId))
      .filter((r) => r.borrowerId === member._id && r.status === "pending")
      .map((r) => ({ id: r._id, startDate: r.startDate, endDate: r.endDate }));
    return { requestable: status, pending };
  },
});

const MINE_LIMIT = 100;
const optionalTime = v.union(v.number(), v.null());

/** A history event as the borrower or owner sees it (no user IDs). */
export const historyDto = v.object({
  from: v.union(borrowStatusValidator, v.null()),
  to: borrowStatusValidator,
  /** "you" when the caller made the change. */
  by: v.union(v.literal("you"), requestActorValidator),
  at: v.number(),
  reason: v.union(requestReasonValidator, v.null()),
});

/** A request's history, oldest first, from the caller's point of view. */
export async function historyFor(
  ctx: QueryCtx,
  requestId: Id<"borrowRequests">,
  me: Id<"users">,
) {
  const events = await ctx.db
    .query("requestEvents")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .collect();
  return events
    .sort((a, b) => a.at - b.at)
    .map((e) => ({
      from: e.from,
      to: e.to,
      by: e.actorId === me ? ("you" as const) : e.actor,
      at: e.at,
      reason: e.reason ?? null,
    }));
}

const myRequestDto = v.object({
  id: v.id("borrowRequests"),
  status: borrowStatusValidator,
  /** Half-open `[startDate, endDate)`. */
  startDate: v.string(),
  endDate: v.string(),
  message: v.union(v.string(), v.null()),
  createdAt: v.number(),
  approvedAt: optionalTime,
  readyAt: optionalTime,
  pickedUpAt: optionalTime,
  returnedAt: optionalTime,
  declinedAt: optionalTime,
  cancelledAt: optionalTime,
  cancelledBy: v.union(v.literal("you"), v.literal("owner"), v.null()),
  cancelReason: v.union(v.literal("listing_archived"), v.null()),
  declineReason: v.union(v.literal("dates_taken"), v.null()),
  /** UTC instant the loan becomes overdue (set at pickup). */
  dueAt: optionalTime,
  /** The owner's pickup note: only once the request is approved. */
  pickupNote: v.union(v.string(), v.null()),
  history: v.array(historyDto),
  listing: v.object({
    id: v.id("listings"),
    name: v.string(),
    locationLabel: v.string(),
    photo: v.union(v.string(), v.null()),
    active: v.boolean(),
  }),
  /** Same members-only owner view as Explore: "Marc S.", avatar. */
  owner: ownerDto,
});

/** The caller's requests as a borrower, newest first ([] when signed out). */
export const mine = query({
  args: {},
  returns: v.array(myRequestDto),
  handler: async (ctx) => {
    const borrower = await getActiveMember(ctx);
    if (!borrower) return [];
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", borrower._id))
      .order("desc")
      .take(MINE_LIMIT);

    const result = [];
    for (const r of requests) {
      const listing = await ctx.db.get(r.listingId);
      if (!listing) continue;
      const owner = await ctx.db.get(listing.ownerId);
      const photos = await photosOf(ctx, listing);
      result.push({
        id: r._id,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        message: r.message ?? null,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt ?? null,
        readyAt: r.readyAt ?? null,
        pickedUpAt: r.pickedUpAt ?? null,
        returnedAt: r.returnedAt ?? null,
        declinedAt: r.declinedAt ?? null,
        cancelledAt: r.cancelledAt ?? null,
        cancelledBy:
          r.cancelledBy === undefined
            ? null
            : r.cancelledBy === borrower._id
              ? ("you" as const)
              : ("owner" as const),
        cancelReason: r.cancelReason ?? null,
        declineReason:
          r.declineReason === "dates_taken" ? ("dates_taken" as const) : null,
        dueAt: r.dueAt ?? null,
        pickupNote: PICKUP_NOTE_VISIBLE.has(r.status)
          ? (r.pickupNote ?? null)
          : null,
        history: await historyFor(ctx, r._id, borrower._id),
        listing: {
          id: listing._id,
          name: listing.name,
          locationLabel: listing.locationLabel,
          photo: photos[0]?.src ?? null,
          active: listing.status === "active",
        },
        owner: owner
          ? toOwner(owner)
          : { profileId: "", displayName: "Neighbour", imageUrl: null },
      });
    }
    return result;
  },
});
