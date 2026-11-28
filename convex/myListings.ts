import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  cancelPendingForArchivedListing,
  requestsForListing,
} from "./borrowRequests";
import { availabilityOf, findListing } from "./listings";
import { requireUser } from "./lib/auth";
import { BLOCKING_STATUSES } from "./lib/requestRules";
import {
  ACTIVE_LISTINGS_MAX,
  listingTextProblems,
  photoCountProblem,
  type ListingField,
} from "./lib/listingRules";
import { categoryValidator, conditionValidator } from "./schema";
import { deleteUpload } from "./uploads";

/**
 * A member's own listings (Phase 6): create, edit, archive, list, load for
 * editing. The owner is always the signed-in member from the verified
 * Clerk token, never an argument. Edit and archive work only on the
 * caller's own ACTIVE listings; anything else reads as "not found", so the
 * existence of other people's or archived listings is not revealed.
 */

type ListingErrorCode = "INVALID" | "NOT_FOUND" | "LIMIT_REACHED" | "ON_LOAN";

function listingError(
  code: ListingErrorCode,
  message: string,
  fields?: Partial<Record<ListingField, string>>,
) {
  return new ConvexError({ code, message, fields: fields ?? {} });
}

const PHOTO_UNAVAILABLE =
  "One of the photos can’t be used any more. Remove it and upload it again.";

const listingInput = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
  area: v.string(),
  photoIds: v.array(v.id("uploads")),
};

type ListingInput = {
  name: string;
  description: string;
  area: string;
  photoIds: Id<"uploads">[];
};

/** Field checks shared by create and update (throws INVALID). */
function validate(input: ListingInput) {
  const problems = listingTextProblems(input);
  const photos = photoCountProblem(input.photoIds.length);
  if (photos) problems.photos = photos;
  if (new Set(input.photoIds).size !== input.photoIds.length) {
    problems.photos = "The same photo was added twice.";
  }
  if (Object.keys(problems).length > 0) {
    throw listingError(
      "INVALID",
      "Please check the highlighted fields.",
      problems,
    );
  }
}

/**
 * Resolves photo IDs to uploads the caller may use on this listing:
 * their own pending uploads, or photos already attached to `listingId`.
 */
async function usablePhotos(
  ctx: MutationCtx,
  owner: Doc<"users">,
  photoIds: Id<"uploads">[],
  listingId: Id<"listings"> | null,
): Promise<Doc<"uploads">[]> {
  const uploads: Doc<"uploads">[] = [];
  for (const id of photoIds) {
    const upload = await ctx.db.get(id);
    const usable =
      upload !== null &&
      upload.ownerId === owner._id &&
      (upload.status === "pending" ||
        (upload.status === "attached" &&
          listingId !== null &&
          upload.listingId === listingId));
    if (!upload || !usable) {
      throw listingError("INVALID", PHOTO_UNAVAILABLE, {
        photos: PHOTO_UNAVAILABLE,
      });
    }
    uploads.push(upload);
  }
  return uploads;
}

async function attach(
  ctx: MutationCtx,
  uploads: Doc<"uploads">[],
  listingId: Id<"listings">,
) {
  for (const upload of uploads) {
    if (upload.status !== "attached" || upload.listingId !== listingId) {
      await ctx.db.patch(upload._id, { status: "attached", listingId });
    }
  }
}

const ACTIVE_LOAN = new Set<string>(BLOCKING_STATUSES);

/**
 * Is a loan arranged or under way (approved, ready for pickup, borrowed,
 * overdue or return pending)? Archiving is refused then (Phase 8).
 */
async function hasActiveLoan(
  ctx: QueryCtx,
  listingId: Id<"listings">,
): Promise<boolean> {
  return (await requestsForListing(ctx, listingId)).some((r) =>
    ACTIVE_LOAN.has(r.status),
  );
}

/** Has any borrow request ever referenced this listing? */
async function hasLoanHistory(
  ctx: QueryCtx,
  listingId: Id<"listings">,
): Promise<boolean> {
  const first = await ctx.db
    .query("borrowRequests")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .first();
  return first !== null;
}

/**
 * Photos leaving a listing: deleted if the listing has no loan history,
 * otherwise kept ("retained") for borrowing history.
 */
async function releasePhotos(
  ctx: MutationCtx,
  listingId: Id<"listings">,
  uploads: Doc<"uploads">[],
) {
  if (uploads.length === 0) return;
  const keep = await hasLoanHistory(ctx, listingId);
  for (const upload of uploads) {
    if (keep) await ctx.db.patch(upload._id, { status: "retained" });
    else await deleteUpload(ctx, upload);
  }
}

async function attachedPhotos(ctx: QueryCtx, listingId: Id<"listings">) {
  return (
    await ctx.db
      .query("uploads")
      .withIndex("by_listing", (q) => q.eq("listingId", listingId))
      .collect()
  ).filter((u) => u.status === "attached");
}

/** The caller's own active listing, or NOT_FOUND. */
async function ownActiveListing(
  ctx: MutationCtx,
  owner: Doc<"users">,
  id: Id<"listings">,
): Promise<Doc<"listings">> {
  const listing = await ctx.db.get(id);
  if (
    !listing ||
    listing.ownerId !== owner._id ||
    listing.status !== "active"
  ) {
    throw listingError(
      "NOT_FOUND",
      "This listing doesn’t exist or can’t be changed.",
    );
  }
  return listing;
}

export const create = mutation({
  args: listingInput,
  returns: v.id("listings"),
  handler: async (ctx, args) => {
    const owner = await requireUser(ctx);
    validate(args);

    const active = await ctx.db
      .query("listings")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerId", owner._id).eq("status", "active"),
      )
      .take(ACTIVE_LISTINGS_MAX);
    if (active.length >= ACTIVE_LISTINGS_MAX) {
      throw listingError(
        "LIMIT_REACHED",
        `You can have up to ${ACTIVE_LISTINGS_MAX} active listings. Remove one to share another.`,
      );
    }

    const uploads = await usablePhotos(ctx, owner, args.photoIds, null);
    const now = Date.now();
    const listingId = await ctx.db.insert("listings", {
      ownerId: owner._id,
      name: args.name.trim(),
      category: args.category,
      condition: args.condition,
      description: args.description.trim(),
      locationLabel: args.area.trim(),
      imageStorageIds: uploads.map((u) => u.storageId),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await attach(ctx, uploads, listingId);
    return listingId;
  },
});

export const update = mutation({
  args: { id: v.id("listings"), ...listingInput },
  returns: v.null(),
  handler: async (ctx, { id, ...input }) => {
    const owner = await requireUser(ctx);
    const listing = await ownActiveListing(ctx, owner, id);
    validate(input);

    const uploads = await usablePhotos(ctx, owner, input.photoIds, id);
    const kept = new Set(uploads.map((u) => u._id));
    const removed = (await attachedPhotos(ctx, id)).filter(
      (u) => !kept.has(u._id),
    );

    await ctx.db.patch(listing._id, {
      name: input.name.trim(),
      category: input.category,
      condition: input.condition,
      description: input.description.trim(),
      locationLabel: input.area.trim(),
      imageStorageIds: uploads.map((u) => u.storageId),
      updatedAt: Date.now(),
    });
    await attach(ctx, uploads, id);
    await releasePhotos(ctx, id, removed);
    return null;
  },
});

/**
 * "Delete" for owners: the listing is archived, never erased, and vanishes
 * from Explore, product pages and My listings. Its photos are kept if the
 * listing ever had a borrow request (history), otherwise deleted. Pending
 * requests on it are cancelled with reason `listing_archived` (Phase 7).
 */
export const archive = mutation({
  args: { id: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const owner = await requireUser(ctx);
    const listing = await ownActiveListing(ctx, owner, id);
    if (await hasActiveLoan(ctx, id)) {
      throw listingError(
        "ON_LOAN",
        "You can’t remove an item while it’s on loan or a loan is arranged.",
      );
    }
    const now = Date.now();
    const keepPhotos = await hasLoanHistory(ctx, id);
    await ctx.db.patch(listing._id, {
      status: "archived",
      archivedAt: now,
      archivedBy: owner._id,
      updatedAt: now,
      ...(keepPhotos ? {} : { imageStorageIds: [] }),
    });
    if (!keepPhotos)
      await releasePhotos(ctx, id, await attachedPhotos(ctx, id));
    await cancelPendingForArchivedListing(ctx, id, owner._id, now);
    return null;
  },
});

const myListingDto = v.object({
  id: v.id("listings"),
  name: v.string(),
  category: categoryValidator,
  mainPhoto: v.union(v.string(), v.null()),
  onLoan: v.boolean(),
  /** A loan is arranged or under way: the listing can't be removed. */
  activeLoan: v.boolean(),
});

/** The caller's active listings, newest first ([] when signed out). */
export const mine = query({
  args: {},
  returns: v.array(myListingDto),
  handler: async (ctx) => {
    const owner = await requireUserOrNull(ctx);
    if (!owner) return [];
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerId", owner._id).eq("status", "active"),
      )
      .order("desc")
      .take(ACTIVE_LISTINGS_MAX);
    const result = [];
    for (const listing of listings) {
      const first = listing.imageStorageIds?.[0];
      result.push({
        id: listing._id,
        name: listing.name,
        category: listing.category,
        mainPhoto: first
          ? await ctx.storage.getUrl(first)
          : (listing.photos?.[0]?.path ?? null),
        onLoan: (await availabilityOf(ctx, listing._id)) === "borrowed",
        activeLoan: await hasActiveLoan(ctx, listing._id),
      });
    }
    return result;
  },
});

/** Everything the edit form needs, for the owner of an active listing. */
export const getForEdit = query({
  args: { id: v.string() },
  returns: v.union(
    v.object({
      id: v.id("listings"),
      name: v.string(),
      category: categoryValidator,
      condition: conditionValidator,
      description: v.string(),
      area: v.string(),
      photos: v.array(v.object({ uploadId: v.id("uploads"), src: v.string() })),
    }),
    v.null(),
  ),
  handler: async (ctx, { id }) => {
    const owner = await requireUserOrNull(ctx);
    if (!owner || id.length > 64) return null;
    const listing = await findListing(ctx, id);
    if (
      !listing ||
      listing.ownerId !== owner._id ||
      listing.status !== "active"
    ) {
      return null;
    }
    const byStorage = new Map(
      (await attachedPhotos(ctx, listing._id)).map((u) => [u.storageId, u]),
    );
    const photos = [];
    for (const storageId of listing.imageStorageIds ?? []) {
      const upload = byStorage.get(storageId);
      const src = await ctx.storage.getUrl(storageId);
      if (upload && src) photos.push({ uploadId: upload._id, src });
    }
    return {
      id: listing._id,
      name: listing.name,
      category: listing.category,
      condition: listing.condition,
      description: listing.description,
      area: listing.locationLabel,
      photos,
    };
  },
});

async function requireUserOrNull(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  try {
    return await requireUser(ctx);
  } catch {
    return null;
  }
}
