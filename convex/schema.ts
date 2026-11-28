import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * LendLoop data model (docs/05_DATABASE_SCHEMA.md). Phase 4 created every
 * table; Phase 5 reads listings (public and member views); Phase 6 lets
 * members create, edit and archive their own listings with uploaded photos;
 * Phase 7 creates pending borrow requests; Phase 8 adds approval, pickup,
 * return, overdue and the append-only `requestEvents` history
 * (docs/DECISIONS.md).
 */

export const roleValidator = v.union(v.literal("user"), v.literal("admin"));

export const categoryValidator = v.union(
  v.literal("home"),
  v.literal("garden"),
  v.literal("sports"),
  v.literal("camping"),
  v.literal("electronics"),
  v.literal("cleaning"),
  v.literal("party"),
  v.literal("diy"),
  v.literal("kids"),
  v.literal("books"),
);

export const conditionValidator = v.union(
  v.literal("new"),
  v.literal("like_new"),
  v.literal("good"),
  v.literal("fair"),
);

export const listingStatusValidator = v.union(
  v.literal("active"),
  v.literal("removed"),
  v.literal("archived"),
);

export const requestActorValidator = v.union(
  v.literal("borrower"),
  v.literal("owner"),
  v.literal("system"),
);

export const requestReasonValidator = v.union(
  v.literal("dates_taken"),
  v.literal("listing_archived"),
  v.literal("due_date_passed"),
);

export const borrowStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("ready_for_pickup"),
  v.literal("borrowed"),
  v.literal("overdue"),
  v.literal("return_pending"),
  v.literal("returned"),
  v.literal("declined"),
  v.literal("cancelled"),
);

export default defineSchema({
  /** Application profile keyed by the Clerk subject (`sub`). */
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    /** Verified primary email from the Clerk token, when Clerk provides it. */
    email: v.optional(v.string()),
    /** Never settable by clients; defaults to "user". */
    role: roleValidator,
    /** Admin-controlled only. */
    isTrustedLender: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    disabledAt: v.optional(v.number()),
    /** Avatar path or URL, shown to signed-in members only. */
    imageUrl: v.optional(v.string()),
    /**
     * Set only on fictional development seed users (convex/seed.ts). Such
     * rows are never treated as a signed-in identity (convex/lib/auth.ts).
     */
    seedKey: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_seedKey", ["seedKey"]),

  listings: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    /** Longer text for the product page; falls back to `description`. */
    longDescription: v.optional(v.string()),
    conditionNote: v.optional(v.string()),
    /** Optional item facts shown on the product page (e.g. Brand, Model). */
    details: v.optional(
      v.array(v.object({ label: v.string(), value: v.string() })),
    ),
    /**
     * Approximate area only, e.g. "Patershol, Gent". Public. Never an
     * address, building, floor or door (docs/DECISIONS.md, Phase 5).
     */
    locationLabel: v.string(),
    /** Photos bundled with the app (`/images/...`), used by seed data. */
    photos: v.optional(
      v.array(v.object({ path: v.string(), label: v.string() })),
    ),
    status: listingStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    /** Uploaded photos in display order (main photo first). */
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    /** Set when the owner deletes the listing (status "archived"). */
    archivedAt: v.optional(v.number()),
    archivedBy: v.optional(v.id("users")),
    removedAt: v.optional(v.number()),
    removedBy: v.optional(v.id("users")),
    removalReason: v.optional(v.string()),
    /** Set only on development seed listings (convex/seed.ts). */
    seedKey: v.optional(v.string()),
  })
    .index("by_seedKey", ["seedKey"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_category_and_status", ["category", "status"])
    .index("by_owner_and_status", ["ownerId", "status"]),

  /**
   * Every uploaded photo (convex/uploads.ts). A file only reaches storage
   * after the server checked its owner, size and real image format.
   * - pending: uploaded, not on a listing yet (deleted after 24 hours)
   * - attached: shown on `listingId`
   * - retained: removed from a listing that has loan history; kept
   */
  uploads: defineTable({
    ownerId: v.id("users"),
    storageId: v.id("_storage"),
    format: v.union(v.literal("jpeg"), v.literal("png"), v.literal("webp")),
    size: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("attached"),
      v.literal("retained"),
    ),
    listingId: v.optional(v.id("listings")),
    createdAt: v.number(),
  })
    .index("by_owner_and_status", ["ownerId", "status"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_listing", ["listingId"])
    .index("by_storageId", ["storageId"]),

  /** One lifecycle record per request; it becomes the loan once approved. */
  borrowRequests: defineTable({
    listingId: v.id("listings"),
    /** Derived from the listing at creation, never from client input. */
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    /**
     * Half-open range of calendar days `[startDate, endDate)`, `YYYY-MM-DD`:
     * `endDate` is the day after the last day of use (Phase 7).
     */
    startDate: v.string(),
    endDate: v.string(),
    /** Borrower's declared IANA time zone (canonical), for date rules. */
    timeZone: v.optional(v.string()),
    /** Optional plain-text note to the owner (max 200 characters). */
    message: v.optional(v.string()),
    status: borrowStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    readyAt: v.optional(v.number()),
    pickedUpAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    cancelledBy: v.optional(v.id("users")),
    /** Set when the system cancelled the request, not a person. */
    cancelReason: v.optional(v.literal("listing_archived")),
    /** Who approved / declined (always the owner; Phase 8). */
    approvedBy: v.optional(v.id("users")),
    declinedBy: v.optional(v.id("users")),
    /**
     * Optional plain-text note the owner adds when approving (max 200
     * characters). Shown only to the borrower, only after approval.
     */
    pickupNote: v.optional(v.string()),
    declineReason: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  })
    .index("by_listing", ["listingId"])
    .index("by_owner", ["ownerId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_status", ["status"])
    .index("by_status_and_dueAt", ["status", "dueAt"])
    .index("by_owner_and_status", ["ownerId", "status"])
    .index("by_borrower_and_status", ["borrowerId", "status"]),

  /**
   * Append-only status history of a request (Phase 8). Only server code
   * inserts rows; nothing updates or deletes them. `actor` is the role that
   * caused the transition; `actorId` is set for people, never for `system`.
   */
  requestEvents: defineTable({
    requestId: v.id("borrowRequests"),
    /** null for the creation event. */
    from: v.union(borrowStatusValidator, v.null()),
    to: borrowStatusValidator,
    actor: requestActorValidator,
    actorId: v.optional(v.id("users")),
    at: v.number(),
    reason: v.optional(requestReasonValidator),
    /** Reconstructed from stored fields for pre-Phase 8 requests. */
    backfilled: v.optional(v.literal(true)),
  }).index("by_request", ["requestId"]),

  /** Outbox for notification events sent to n8n (Phase 10+). */
  automationEvents: defineTable({
    eventKey: v.string(),
    eventType: v.union(
      v.literal("borrow_request_created"),
      v.literal("borrow_request_status_changed"),
      v.literal("overdue_reminder"),
    ),
    requestId: v.id("borrowRequests"),
    recipientUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    attemptCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    sentAt: v.optional(v.number()),
    lastErrorCode: v.optional(v.string()),
  })
    .index("by_eventKey", ["eventKey"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_request", ["requestId"]),

  automationReminders: defineTable({
    reminderKey: v.string(),
    requestId: v.id("borrowRequests"),
    borrowerId: v.id("users"),
    reminderDate: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    attemptCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    sentAt: v.optional(v.number()),
    lastErrorCode: v.optional(v.string()),
  })
    .index("by_reminderKey", ["reminderKey"])
    .index("by_request", ["requestId"]),

  /** Never exposed to standard users. */
  adminAuditLogs: defineTable({
    adminUserId: v.id("users"),
    action: v.union(
      v.literal("listing_removed"),
      v.literal("trusted_lender_granted"),
      v.literal("trusted_lender_revoked"),
    ),
    targetType: v.union(v.literal("listing"), v.literal("user")),
    targetId: v.string(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});
