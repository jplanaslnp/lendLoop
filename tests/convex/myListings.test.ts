// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ACTIVE_LISTINGS_MAX } from "@convex/lib/listingRules";
import schema from "@convex/schema";

import {
  member,
  modules,
  ORIGIN,
  uploadPhoto,
  validListing,
  type Member,
} from "./helpers";

beforeEach(() => {
  vi.stubEnv("APP_ORIGINS", ORIGIN);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

type T = ReturnType<typeof convexTest>;

async function setup() {
  const t = convexTest(schema, modules);
  const alice = await member(t, "alice");
  const bob = await member(t, "bob");
  return { t, alice, bob };
}

async function createListing(as: Member, photos = 1) {
  const ids: Id<"uploads">[] = [];
  for (let i = 0; i < photos; i++) ids.push(await uploadPhoto(as));
  return as.mutation(api.myListings.create, validListing(ids));
}

async function giveLoanHistory(
  t: T,
  listingId: Id<"listings">,
  status: "returned" | "borrowed" = "returned",
) {
  await t.run(async (ctx) => {
    const listing = await ctx.db.get(listingId);
    await ctx.db.insert("borrowRequests", {
      listingId,
      ownerId: listing!.ownerId,
      borrowerId: listing!.ownerId,
      startDate: "2026-12-01",
      endDate: "2026-12-02",
      status,
      createdAt: 0,
      updatedAt: 0,
    });
  });
}

const fileCount = (t: T) =>
  t.run(
    async (ctx) => (await ctx.db.system.query("_storage").collect()).length,
  );

describe("create", () => {
  it("creates an active listing owned by the caller, visible in Explore", async () => {
    const { t, alice } = await setup();
    const id = await createListing(alice, 2);

    const stored = await t.run((ctx) => ctx.db.get(id));
    const me = await alice.query(api.users.current, {});
    expect(stored).toMatchObject({
      ownerId: me!.id,
      status: "active",
      locationLabel: "Patershol, Gent",
    });

    // Public view: the Phase 5 fields, photos from storage, no owner.
    const publicCard = (await t.query(api.listings.list, {})).find(
      (c) => c.id === id,
    );
    expect(Object.keys(publicCard!).sort()).toEqual([
      "availability",
      "category",
      "condition",
      "description",
      "id",
      "locationLabel",
      "name",
      "photos",
    ]);
    expect(publicCard!.photos).toHaveLength(2);
    expect(publicCard!.photos[0]!.src).toMatch(/^https?:\/\//);

    const asBob = await member(t, "bob2");
    const memberCard = (await asBob.query(api.listings.list, {})).find(
      (c) => c.id === id,
    );
    expect(memberCard).toMatchObject({ owner: { displayName: "Alice T." } });
  });

  it("rejects signed-out callers", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.myListings.create, validListing([])),
    ).rejects.toThrow(/sign in/i);
  });

  it("cannot be given another owner", async () => {
    const { alice } = await setup();
    const photo = await uploadPhoto(alice);
    await expect(
      alice.mutation(api.myListings.create, {
        ...validListing([photo]),
        ownerId: "someone-else",
      } as unknown as ReturnType<typeof validListing>),
    ).rejects.toThrow(/Validator error/);
  });

  it.each([
    [{ name: "  " }, "name"],
    [{ name: "x".repeat(61) }, "name"],
    [{ description: "Too short" }, "description"],
    [{ description: "x".repeat(301) }, "description"],
    [{ area: "G" }, "area"],
    [{ area: "Veldstraat 12, Gent" }, "area"],
    [{ area: "9000 Gent" }, "area"],
  ])("rejects invalid fields %o", async (override, field) => {
    const { alice } = await setup();
    const photo = await uploadPhoto(alice);
    const error = await alice
      .mutation(api.myListings.create, {
        ...validListing([photo]),
        ...override,
      })
      .catch((e: unknown) => e);
    expect(String(error)).toMatch(/INVALID/);
    expect(JSON.stringify((error as { data?: unknown }).data)).toContain(
      `"${field}"`,
    );
  });

  it("rejects bad categories and conditions with validators", async () => {
    const { alice } = await setup();
    const photo = await uploadPhoto(alice);
    await expect(
      alice.mutation(api.myListings.create, {
        ...validListing([photo]),
        category: "weapons" as "diy",
      }),
    ).rejects.toThrow(/Validator error/);
    await expect(
      alice.mutation(api.myListings.create, {
        ...validListing([photo]),
        condition: "broken" as "good",
      }),
    ).rejects.toThrow(/Validator error/);
  });

  it("requires 1–4 distinct photos", async () => {
    const { alice } = await setup();
    await expect(
      alice.mutation(api.myListings.create, validListing([])),
    ).rejects.toThrow(/INVALID/);
    const five: Id<"uploads">[] = [];
    for (let i = 0; i < 5; i++) five.push(await uploadPhoto(alice));
    await expect(
      alice.mutation(api.myListings.create, validListing(five)),
    ).rejects.toThrow(/INVALID/);
    await expect(
      alice.mutation(api.myListings.create, validListing([five[0]!, five[0]!])),
    ).rejects.toThrow(/INVALID/);
  });

  it("only accepts the caller's own unattached photos", async () => {
    const { alice, bob } = await setup();
    const bobsPhoto = await uploadPhoto(bob);
    await expect(
      alice.mutation(api.myListings.create, validListing([bobsPhoto])),
    ).rejects.toThrow(/photos can’t be used/);

    const photo = await uploadPhoto(alice);
    await alice.mutation(api.myListings.create, validListing([photo]));
    // Already attached: can't be reused on a second listing.
    await expect(
      alice.mutation(api.myListings.create, validListing([photo])),
    ).rejects.toThrow(/photos can’t be used/);
  });

  it("reuses pending photos after a failed publish", async () => {
    const { alice } = await setup();
    const photo = await uploadPhoto(alice);
    await expect(
      alice.mutation(api.myListings.create, {
        ...validListing([photo]),
        name: "",
      }),
    ).rejects.toThrow(/INVALID/);
    await expect(
      alice.mutation(api.myListings.create, validListing([photo])),
    ).resolves.toBeTruthy();
  });

  it(`stops at ${ACTIVE_LISTINGS_MAX} active listings`, async () => {
    const { t, alice } = await setup();
    const me = await alice.query(api.users.current, {});
    await t.run(async (ctx) => {
      for (let i = 0; i < ACTIVE_LISTINGS_MAX; i++) {
        await ctx.db.insert("listings", {
          ownerId: me!.id,
          name: `Item ${i}`,
          category: "home",
          condition: "good",
          description: "Filler listing for the limit test.",
          locationLabel: "Gent",
          status: "active",
          createdAt: 0,
          updatedAt: 0,
        });
      }
    });
    const photo = await uploadPhoto(alice);
    await expect(
      alice.mutation(api.myListings.create, validListing([photo])),
    ).rejects.toThrow(/LIMIT_REACHED/);
  });
});

describe("update", () => {
  it("lets the owner edit fields and photos", async () => {
    const { t, alice } = await setup();
    const id = await createListing(alice, 2);
    const form = await alice.query(api.myListings.getForEdit, { id });
    const extra = await uploadPhoto(alice, "pixel.png");
    await alice.mutation(api.myListings.update, {
      id,
      ...validListing([extra, form!.photos[0]!.uploadId]),
      name: "Drill (renamed)",
      area: "District 9, Gent",
    });
    const detail = await t.query(api.listings.get, { id });
    expect(detail).toMatchObject({
      name: "Drill (renamed)",
      locationLabel: "District 9, Gent",
    });
    expect(detail!.photos).toHaveLength(2);
    // The dropped photo had no loan history: file and record are gone.
    expect(await fileCount(t)).toBe(2);
  });

  it("keeps removed photos when the listing has loan history", async () => {
    const { t, alice } = await setup();
    const id = await createListing(alice, 2);
    await giveLoanHistory(t, id);
    const form = await alice.query(api.myListings.getForEdit, { id });
    await alice.mutation(api.myListings.update, {
      id,
      ...validListing([form!.photos[1]!.uploadId]),
    });
    const statuses = await t.run(async (ctx) =>
      (await ctx.db.query("uploads").collect()).map((u) => u.status).sort(),
    );
    expect(statuses).toEqual(["attached", "retained"]);
    expect(await fileCount(t)).toBe(2);
  });

  it("reads as not found for other users and for archived listings", async () => {
    const { t, alice, bob } = await setup();
    const id = await createListing(alice);
    const bobPhoto = await uploadPhoto(bob);
    await expect(
      bob.mutation(api.myListings.update, { id, ...validListing([bobPhoto]) }),
    ).rejects.toThrow(/NOT_FOUND/);
    expect(await bob.query(api.myListings.getForEdit, { id })).toBeNull();
    expect(await t.query(api.myListings.getForEdit, { id })).toBeNull();

    await alice.mutation(api.myListings.archive, { id });
    const photo = await uploadPhoto(alice);
    await expect(
      alice.mutation(api.myListings.update, { id, ...validListing([photo]) }),
    ).rejects.toThrow(/NOT_FOUND/);
    expect(await alice.query(api.myListings.getForEdit, { id })).toBeNull();
  });

  it("can't edit seed listings", async () => {
    vi.stubEnv("LENDLOOP_DEV_SEED", "enabled");
    const { t, alice } = await setup();
    const { internal } = await import("@convex/_generated/api");
    await t.mutation(internal.seed.run, {});
    const projector = (await t.query(api.listings.get, { id: "projector" }))!;
    const photo = await uploadPhoto(alice);
    await expect(
      alice.mutation(api.myListings.update, {
        id: projector.id,
        ...validListing([photo]),
      }),
    ).rejects.toThrow(/NOT_FOUND/);
    await expect(
      alice.mutation(api.myListings.archive, { id: projector.id }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe("archive", () => {
  it("hides the listing everywhere but keeps the record", async () => {
    const { t, alice } = await setup();
    const id = await createListing(alice, 2);
    await alice.mutation(api.myListings.archive, { id });

    expect(await t.query(api.listings.get, { id })).toBeNull();
    expect(
      (await t.query(api.listings.list, {})).map((c) => c.id),
    ).not.toContain(id);
    expect(await alice.query(api.myListings.mine, {})).toEqual([]);

    const stored = await t.run((ctx) => ctx.db.get(id));
    expect(stored).toMatchObject({
      status: "archived",
      name: "Cordless Drill",
    });
    expect(stored!.archivedAt).toEqual(expect.any(Number));
    // Never requested: photos are deleted.
    expect(await fileCount(t)).toBe(0);
  });

  it("keeps photos when the listing has loan history", async () => {
    const { t, alice } = await setup();
    const id = await createListing(alice, 2);
    await giveLoanHistory(t, id);
    await alice.mutation(api.myListings.archive, { id });
    expect(await fileCount(t)).toBe(2);
    const stored = await t.run((ctx) => ctx.db.get(id));
    expect(stored!.imageStorageIds).toHaveLength(2);
  });

  it("is refused while the item is on loan", async () => {
    const { t, alice } = await setup();
    const id = await createListing(alice);
    await giveLoanHistory(t, id, "borrowed");
    await expect(
      alice.mutation(api.myListings.archive, { id }),
    ).rejects.toThrow(/ON_LOAN/);
    expect(await alice.query(api.myListings.mine, {})).toMatchObject([
      { id, onLoan: true },
    ]);
  });

  it("only works for the owner, once", async () => {
    const { t, alice, bob } = await setup();
    const id = await createListing(alice);
    await expect(bob.mutation(api.myListings.archive, { id })).rejects.toThrow(
      /NOT_FOUND/,
    );
    await expect(t.mutation(api.myListings.archive, { id })).rejects.toThrow(
      /sign in/i,
    );
    await alice.mutation(api.myListings.archive, { id });
    await expect(
      alice.mutation(api.myListings.archive, { id }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe("mine", () => {
  it("returns only the caller's active listings", async () => {
    const { t, alice, bob } = await setup();
    const a1 = await createListing(alice);
    const a2 = await createListing(alice);
    await createListing(bob);
    await alice.mutation(api.myListings.archive, { id: a1 });

    const mine = await alice.query(api.myListings.mine, {});
    expect(mine.map((l) => l.id)).toEqual([a2]);
    expect(mine[0]).toMatchObject({
      name: "Cordless Drill",
      category: "diy",
      onLoan: false,
      mainPhoto: expect.stringMatching(/^https?:\/\//),
    });
    expect(await t.query(api.myListings.mine, {})).toEqual([]);
  });
});
