import { v, type Infer } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getActiveMember } from "./lib/auth";
import { categoryValidator, conditionValidator } from "./schema";

/**
 * Explore and product-page reads (Phase 5).
 *
 * Privacy rule (docs/DECISIONS.md, Phase 5): everyone may see the item
 * itself (photos, name, category, description, condition, availability and
 * the approximate area). Owner identity is added ONLY for a signed-in,
 * enabled member, and is built here from an allow-list of fields. Logged-out
 * results have no `owner` key at all: the item fields are copied one by one
 * in `toItem`, and `owner` is added only in the `member` branch below
 * (tests/convex/listings.test.ts checks the exact public key set).
 */

const LIST_LIMIT = 100;
const ID_MAX = 64;

/** Loan states in which the item is with a borrower (docs/06). */
const OUT_ON_LOAN = new Set<Doc<"borrowRequests">["status"]>([
  "borrowed",
  "overdue",
  "return_pending",
]);

const photoDto = v.object({ src: v.string(), label: v.string() });

export const ownerDto = v.object({
  /** Route key for the owner's profile page (members only). */
  profileId: v.string(),
  /** First name and last-name initial, e.g. "Marc S.". */
  displayName: v.string(),
  imageUrl: v.union(v.string(), v.null()),
});

const itemFields = {
  id: v.id("listings"),
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
  availability: v.union(v.literal("available"), v.literal("borrowed")),
  locationLabel: v.string(),
  photos: v.array(photoDto),
};

const publicCard = v.object(itemFields);
const memberCard = v.object({ ...itemFields, owner: ownerDto });

const detailFields = {
  ...itemFields,
  longDescription: v.union(v.string(), v.null()),
  conditionNote: v.union(v.string(), v.null()),
  details: v.array(v.object({ label: v.string(), value: v.string() })),
};

const publicDetail = v.object(detailFields);
const memberDetail = v.object({ ...detailFields, owner: ownerDto });

export type PublicListingCard = Infer<typeof publicCard>;
export type MemberListingCard = Infer<typeof memberCard>;
export type PublicListingDetail = Infer<typeof publicDetail>;
export type MemberListingDetail = Infer<typeof memberDetail>;
export type ListingOwnerDto = Infer<typeof ownerDto>;

/** "Marc Soler" → "Marc S."; a single word stays as it is. */
export function shortDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Neighbour";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const initial = last ? Array.from(last)[0]?.toLocaleUpperCase() : undefined;
  return initial ? `${first} ${initial}.` : first;
}

export async function availabilityOf(
  ctx: QueryCtx,
  listingId: Id<"listings">,
): Promise<"available" | "borrowed"> {
  const requests = await ctx.db
    .query("borrowRequests")
    .withIndex("by_listing", (q) => q.eq("listingId", listingId))
    .collect();
  return requests.some((r) => OUT_ON_LOAN.has(r.status))
    ? "borrowed"
    : "available";
}

/**
 * Photo URLs in display order: uploaded photos (Convex storage) or, for
 * development seed listings, images bundled with the app.
 */
export async function photosOf(
  ctx: QueryCtx,
  listing: Doc<"listings">,
): Promise<{ src: string; label: string }[]> {
  if (listing.imageStorageIds?.length) {
    const photos: { src: string; label: string }[] = [];
    for (const [i, storageId] of listing.imageStorageIds.entries()) {
      const src = await ctx.storage.getUrl(storageId);
      if (src)
        photos.push({ src, label: i === 0 ? "Main photo" : `Photo ${i + 1}` });
    }
    return photos;
  }
  return (listing.photos ?? []).map((p) => ({ src: p.path, label: p.label }));
}

async function toItem(
  ctx: QueryCtx,
  listing: Doc<"listings">,
): Promise<PublicListingCard> {
  return {
    id: listing._id,
    name: listing.name,
    category: listing.category,
    condition: listing.condition,
    description: listing.description,
    availability: await availabilityOf(ctx, listing._id),
    locationLabel: listing.locationLabel,
    photos: await photosOf(ctx, listing),
  };
}

export function toOwner(owner: Doc<"users">): Infer<typeof ownerDto> {
  return {
    profileId: owner.seedKey ?? owner._id,
    displayName: shortDisplayName(owner.name),
    imageUrl: owner.imageUrl ?? null,
  };
}

/** Owner of a visible listing, or null if the account is gone or disabled. */
export async function visibleOwner(
  ctx: QueryCtx,
  listing: Doc<"listings">,
): Promise<Doc<"users"> | null> {
  const owner = await ctx.db.get(listing.ownerId);
  return owner && owner.disabledAt === undefined ? owner : null;
}

/**
 * Active listings, newest first, optionally filtered by category. Members
 * also get the owner's display name and avatar.
 */
export const list = query({
  args: { category: v.optional(categoryValidator) },
  returns: v.union(v.array(publicCard), v.array(memberCard)),
  handler: async (ctx, { category }) => {
    const member = await getActiveMember(ctx);
    const listings = await (
      category
        ? ctx.db
            .query("listings")
            .withIndex("by_category_and_status", (q) =>
              q.eq("category", category).eq("status", "active"),
            )
        : ctx.db
            .query("listings")
            .withIndex("by_status", (q) => q.eq("status", "active"))
    )
      .order("desc")
      .take(LIST_LIMIT);

    const publicCards: PublicListingCard[] = [];
    const memberCards: MemberListingCard[] = [];
    for (const listing of listings) {
      const owner = await visibleOwner(ctx, listing);
      if (!owner) continue;
      const item = await toItem(ctx, listing);
      if (member) memberCards.push({ ...item, owner: toOwner(owner) });
      else publicCards.push(item);
    }
    return member ? memberCards : publicCards;
  },
});

/** Finds a listing by Convex ID, or by a development seed key. */
export async function findListing(
  ctx: QueryCtx,
  id: string,
): Promise<Doc<"listings"> | null> {
  const listingId = ctx.db.normalizeId("listings", id);
  if (listingId) return ctx.db.get(listingId);
  // Seed keys keep the design's demo links (e.g. /tools/projector) working.
  return ctx.db
    .query("listings")
    .withIndex("by_seedKey", (q) => q.eq("seedKey", id))
    .unique();
}

/**
 * One active listing for the product page, or null when the ID is unknown,
 * malformed, or the listing is not visible.
 */
export const get = query({
  args: { id: v.string() },
  returns: v.union(publicDetail, memberDetail, v.null()),
  handler: async (ctx, { id }) => {
    if (id.length === 0 || id.length > ID_MAX) return null;
    const listing = await findListing(ctx, id);
    if (!listing || listing.status !== "active") return null;
    const owner = await visibleOwner(ctx, listing);
    if (!owner) return null;

    const detail = {
      ...(await toItem(ctx, listing)),
      longDescription: listing.longDescription ?? null,
      conditionNote: listing.conditionNote ?? null,
      details: listing.details ?? [],
    };
    const member = await getActiveMember(ctx);
    return member ? { ...detail, owner: toOwner(owner) } : detail;
  },
});
