import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { SEED_LISTINGS, SEED_OWNERS } from "./seedData";

/**
 * Development seed data (manual only). These are internal functions: they
 * cannot be called from the browser, only with `npx convex run` by someone
 * with access to the deployment. Both refuse to run unless the deployment
 * sets LENDLOOP_DEV_SEED=enabled, which is never set in production.
 *
 *   npx convex env set LENDLOOP_DEV_SEED enabled   # dev deployment only
 *   npx convex run seed:run                        # create or refresh
 *   npx convex run seed:clear                      # remove seed rows only
 *
 * Seed users get a `seed:<key>` clerkId (never a Clerk `user_…` ID) and a
 * `seedKey`, so they can never be used as a signed-in identity.
 */

export const SEED_FLAG = "LENDLOOP_DEV_SEED";

function assertSeedAllowed() {
  if (process.env[SEED_FLAG] !== "enabled") {
    throw new ConvexError({
      code: "SEED_DISABLED",
      message: `Seeding is disabled. Set ${SEED_FLAG}=enabled on a development deployment only.`,
    });
  }
}

const counts = v.object({
  users: v.object({ created: v.number(), updated: v.number() }),
  listings: v.object({ created: v.number(), updated: v.number() }),
});

async function upsertOwner(
  ctx: MutationCtx,
  owner: (typeof SEED_OWNERS)[number],
  now: number,
): Promise<{ id: Id<"users">; created: boolean }> {
  const fields = {
    name: owner.name,
    imageUrl: `/images/avatars/${owner.key}.jpg`,
  };
  const existing = await ctx.db
    .query("users")
    .withIndex("by_seedKey", (q) => q.eq("seedKey", owner.key))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
    return { id: existing._id, created: false };
  }
  const id = await ctx.db.insert("users", {
    ...fields,
    clerkId: `seed:${owner.key}`,
    seedKey: owner.key,
    role: "user",
    isTrustedLender: false,
    createdAt: now,
    updatedAt: now,
  });
  return { id, created: true };
}

/** Creates or refreshes the seed owners and listings. Idempotent. */
export const run = internalMutation({
  args: {},
  returns: counts,
  handler: async (ctx) => {
    assertSeedAllowed();
    const now = Date.now();
    const result = {
      users: { created: 0, updated: 0 },
      listings: { created: 0, updated: 0 },
    };

    const owners = new Map<string, { id: Id<"users">; location: string }>();
    for (const owner of SEED_OWNERS) {
      const { id, created } = await upsertOwner(ctx, owner, now);
      result.users[created ? "created" : "updated"] += 1;
      owners.set(owner.key, { id, location: owner.locationLabel });
    }

    // Insert in reverse so "newest first" matches the design's order.
    for (const listing of [...SEED_LISTINGS].reverse()) {
      const owner = owners.get(listing.owner);
      if (!owner) throw new Error(`Unknown seed owner: ${listing.owner}`);
      const fields = {
        ownerId: owner.id,
        name: listing.name,
        category: listing.category,
        condition: listing.condition,
        description: listing.description,
        longDescription: listing.longDescription,
        conditionNote: listing.conditionNote,
        details: listing.details,
        locationLabel: owner.location,
        photos: listing.photos,
        status: "active" as const,
      };
      const existing = await ctx.db
        .query("listings")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", listing.key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { ...fields, updatedAt: now });
        result.listings.updated += 1;
      } else {
        await ctx.db.insert("listings", {
          ...fields,
          seedKey: listing.key,
          createdAt: now,
          updatedAt: now,
        });
        result.listings.created += 1;
      }
    }
    return result;
  },
});

/** Deletes seed listings and seed users only. Real accounts are untouched. */
export const clear = internalMutation({
  args: {},
  returns: v.object({ users: v.number(), listings: v.number() }),
  handler: async (ctx) => {
    assertSeedAllowed();
    let listings = 0;
    let users = 0;
    for (const listing of SEED_LISTINGS) {
      const row = await ctx.db
        .query("listings")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", listing.key))
        .unique();
      if (row) {
        await ctx.db.delete(row._id);
        listings += 1;
      }
    }
    for (const owner of SEED_OWNERS) {
      const row = await ctx.db
        .query("users")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", owner.key))
        .unique();
      if (row) {
        await ctx.db.delete(row._id);
        users += 1;
      }
    }
    return { users, listings };
  },
});
