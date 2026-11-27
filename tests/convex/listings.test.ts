// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "@convex/_generated/api";
import { shortDisplayName, type MemberListingCard } from "@convex/listings";
import schema from "@convex/schema";
import { SEED_LISTINGS, SEED_OWNERS } from "@convex/seedData";

const modules = import.meta.glob("../../convex/**/*.ts");

const member = {
  subject: "user_member",
  issuer: "https://example.clerk.accounts.dev",
  name: "Mia Member",
};

/** Keys that identify an owner; none may reach a logged-out visitor. */
const OWNER_KEYS = [
  "owner",
  "ownerId",
  "clerkId",
  "seedKey",
  "email",
  "imageUrl",
  "profileId",
];

const PERMITTED_PUBLIC_KEYS = [
  "availability",
  "category",
  "condition",
  "description",
  "id",
  "locationLabel",
  "name",
  "photos",
].sort();

async function seeded() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.seed.run, {});
  return t;
}

async function signedInMember(t: ReturnType<typeof convexTest>) {
  const asMember = t.withIdentity(member);
  await asMember.mutation(api.users.ensureCurrent, {});
  return asMember;
}

beforeEach(() => {
  vi.stubEnv("LENDLOOP_DEV_SEED", "enabled");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("listings.list — public (logged out)", () => {
  it("returns every permitted item field and no owner identity", async () => {
    const t = await seeded();
    const cards = await t.query(api.listings.list, {});
    expect(cards).toHaveLength(SEED_LISTINGS.length);

    const projector = cards.find((c) => c.name === "Projector");
    expect(projector).toEqual({
      id: expect.any(String),
      name: "Projector",
      category: "electronics",
      condition: "like_new",
      description: expect.stringContaining("Full HD portable projector"),
      availability: "available",
      locationLabel: "Patershol, Gent",
      photos: [{ src: "/images/tools/projector.jpg", label: "Main photo" }],
    });

    for (const card of cards) {
      expect(Object.keys(card).sort()).toEqual(PERMITTED_PUBLIC_KEYS);
      const json = JSON.stringify(card);
      for (const key of OWNER_KEYS) expect(json).not.toContain(`"${key}"`);
      for (const owner of SEED_OWNERS) {
        expect(json).not.toContain(owner.name.split(" ")[0]);
      }
      expect(json).not.toContain("/images/avatars/");
    }
  });

  it("keeps the design order (newest first)", async () => {
    const t = await seeded();
    const names = (await t.query(api.listings.list, {})).map((c) => c.name);
    expect(names).toEqual(SEED_LISTINGS.map((l) => l.name));
  });

  it("filters by category on the server", async () => {
    const t = await seeded();
    const camping = await t.query(api.listings.list, { category: "camping" });
    expect(camping.map((c) => c.name)).toEqual(["Camping Chair", "Cooler Box"]);
    expect(await t.query(api.listings.list, { category: "party" })).toEqual([]);
  });

  it("rejects an unknown category", async () => {
    const t = await seeded();
    await expect(
      t.query(api.listings.list, {
        category: "weapons" as unknown as "home",
      }),
    ).rejects.toThrow(/Validator error/);
  });

  it("hides inactive listings and listings of disabled owners", async () => {
    const t = await seeded();
    await t.run(async (ctx) => {
      const projector = await ctx.db
        .query("listings")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", "projector"))
        .unique();
      await ctx.db.patch(projector!._id, { status: "removed" });
      const laura = await ctx.db
        .query("users")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", "laura"))
        .unique();
      await ctx.db.patch(laura!._id, { disabledAt: Date.now() });
    });
    const names = (await t.query(api.listings.list, {})).map((c) => c.name);
    expect(names).not.toContain("Projector");
    expect(names).not.toContain("Camping Chair");
    expect(names).not.toContain("City Bicycle");
    expect(await t.query(api.listings.get, { id: "projector" })).toBeNull();
  });

  it("marks an item that is out on loan as borrowed", async () => {
    const t = await seeded();
    await t.run(async (ctx) => {
      const drill = await ctx.db
        .query("listings")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", "drill"))
        .unique();
      await ctx.db.insert("borrowRequests", {
        listingId: drill!._id,
        ownerId: drill!.ownerId,
        borrowerId: drill!.ownerId,
        startDate: "2026-11-26",
        endDate: "2026-11-28",
        status: "borrowed",
        createdAt: 0,
        updatedAt: 0,
      });
    });
    const drill = await t.query(api.listings.get, { id: "drill" });
    expect(drill?.availability).toBe("borrowed");
  });
});

describe("listings — signed-in member", () => {
  it("adds the owner's first name and last-name initial only", async () => {
    const t = await seeded();
    const asMember = await signedInMember(t);
    const cards = await asMember.query(api.listings.list, {});
    const projector = cards.find((c) => c.name === "Projector");
    expect(projector).toMatchObject({
      owner: {
        profileId: "marc",
        displayName: "Marc S.",
        imageUrl: "/images/avatars/marc.jpg",
      },
    });
    for (const card of cards) {
      const { owner } = card as MemberListingCard;
      expect(Object.keys(owner).sort()).toEqual([
        "displayName",
        "imageUrl",
        "profileId",
      ]);
      const json = JSON.stringify(card);
      expect(json).not.toContain("clerkId");
      expect(json).not.toContain("Soler");
    }
  });

  it("treats a signed-in caller without a profile as logged out", async () => {
    const t = await seeded();
    const cards = await t.withIdentity(member).query(api.listings.list, {});
    expect(cards.every((c) => !("owner" in c))).toBe(true);
  });

  it("treats a disabled member as logged out", async () => {
    const t = await seeded();
    const asMember = await signedInMember(t);
    await t.run(async (ctx) => {
      const me = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", member.subject))
        .unique();
      await ctx.db.patch(me!._id, { disabledAt: Date.now() });
    });
    const detail = await asMember.query(api.listings.get, { id: "projector" });
    expect(detail && "owner" in detail).toBe(false);
  });
});

describe("listings.get", () => {
  it("returns the same item data as Explore, plus product-page fields", async () => {
    const t = await seeded();
    const card = (await t.query(api.listings.list, {})).find(
      (c) => c.name === "DJI Osmo Mobile",
    )!;
    const byId = await t.query(api.listings.get, { id: card.id });
    const bySeedKey = await t.query(api.listings.get, { id: "osmo-mobile" });
    expect(byId).toEqual(bySeedKey);
    expect(byId).toMatchObject({
      ...card,
      conditionNote: "Used a handful of times, no visible wear.",
      details: expect.arrayContaining([{ label: "Brand", value: "DJI" }]),
    });
    expect(byId && "owner" in byId).toBe(false);

    const asMember = await signedInMember(t);
    expect(
      await asMember.query(api.listings.get, { id: card.id }),
    ).toMatchObject({ owner: { displayName: "Ruben G." } });
  });

  it.each([
    "",
    "does-not-exist",
    "x".repeat(65),
    "js7dg35w5bm4pxnnxr4b7nxjhd8jyjdh",
  ])("returns null for a missing or invalid ID (%s)", async (id) => {
    const t = await seeded();
    expect(await t.query(api.listings.get, { id })).toBeNull();
  });

  it("does not resolve a user ID as a listing", async () => {
    const t = await seeded();
    const userId = await t.run(async (ctx) => {
      const marc = await ctx.db
        .query("users")
        .withIndex("by_seedKey", (q) => q.eq("seedKey", "marc"))
        .unique();
      return marc!._id;
    });
    expect(await t.query(api.listings.get, { id: userId })).toBeNull();
  });
});

describe("seed", () => {
  it("is idempotent", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.seed.run, {});
    expect(first).toEqual({
      users: { created: SEED_OWNERS.length, updated: 0 },
      listings: { created: SEED_LISTINGS.length, updated: 0 },
    });
    const second = await t.mutation(internal.seed.run, {});
    expect(second).toEqual({
      users: { created: 0, updated: SEED_OWNERS.length },
      listings: { created: 0, updated: SEED_LISTINGS.length },
    });
    const totals = await t.run(async (ctx) => ({
      users: (await ctx.db.query("users").collect()).length,
      listings: (await ctx.db.query("listings").collect()).length,
    }));
    expect(totals).toEqual({
      users: SEED_OWNERS.length,
      listings: SEED_LISTINGS.length,
    });
  });

  it("refuses to run unless the deployment opts in", async () => {
    vi.stubEnv("LENDLOOP_DEV_SEED", "");
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.seed.run, {})).rejects.toThrow(
      /Seeding is disabled/,
    );
    await expect(t.mutation(internal.seed.clear, {})).rejects.toThrow(
      /Seeding is disabled/,
    );
  });

  it("clear removes only seed rows", async () => {
    const t = await seeded();
    await signedInMember(t);
    expect(await t.mutation(internal.seed.clear, {})).toEqual({
      users: SEED_OWNERS.length,
      listings: SEED_LISTINGS.length,
    });
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users.map((u) => u.clerkId)).toEqual([member.subject]);
  });

  it("seed users can never act as a signed-in identity", async () => {
    const t = await seeded();
    const asSeed = t.withIdentity({ subject: "seed:marc", name: "Marc" });
    expect(await asSeed.query(api.users.current, {})).toBeNull();
    await expect(asSeed.mutation(api.users.ensureCurrent, {})).rejects.toThrow(
      /Unsupported account/,
    );
    const cards = await asSeed.query(api.listings.list, {});
    expect(cards.every((c) => !("owner" in c))).toBe(true);
  });
});

describe("shortDisplayName", () => {
  it.each([
    ["Marc Soler", "Marc S."],
    ["Laura Pérez García", "Laura G."],
    ["  ana  de la  cruz ", "ana C."],
    ["Neighbour", "Neighbour"],
    ["", "Neighbour"],
  ])("%s → %s", (name, expected) => {
    expect(shortDisplayName(name)).toBe(expected);
  });
});
