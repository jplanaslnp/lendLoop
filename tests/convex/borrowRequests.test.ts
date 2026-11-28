// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { findBlockingConflict } from "@convex/borrowRequests";
import { PENDING_REQUESTS_MAX } from "@convex/lib/requestRules";
import schema from "@convex/schema";

import { identity, member, modules } from "./helpers";

/**
 * Borrow requests (Phase 7). The clock is fixed at 2026-11-28 10:00 UTC
 * (11:00 in Brussels), so "today" is Nov 28 in Europe.
 */
const NOW = new Date("2026-11-28T10:00:00Z");
const TZ = "Europe/Brussels";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

type T = TestConvex<typeof schema>;
type Status = Doc<"borrowRequests">["status"];

let keySeq = 0;
const key = () => `key-${(++keySeq).toString().padStart(8, "0")}`;

const request = (
  listingId: Id<"listings">,
  startDate = "2026-12-01",
  endDate = "2026-12-04",
  extra: Partial<{
    timeZone: string;
    message: string;
    idempotencyKey: string;
  }> = {},
) => ({
  listingId,
  startDate,
  endDate,
  timeZone: TZ,
  idempotencyKey: key(),
  ...extra,
});

async function userId(t: T, name: string): Promise<Id<"users">> {
  return t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", `user_${name}`))
      .unique();
    if (!user) throw new Error(`no user ${name}`);
    return user._id;
  });
}

async function listingOf(
  t: T,
  ownerId: Id<"users">,
  extra: Partial<Doc<"listings">> = {},
): Promise<Id<"listings">> {
  return t.run((ctx) =>
    ctx.db.insert("listings", {
      ownerId,
      name: "Step Ladder",
      category: "diy",
      condition: "good",
      description: "Aluminium step ladder, three steps.",
      locationLabel: "Patershol, Gent",
      status: "active",
      createdAt: 1,
      updatedAt: 1,
      ...extra,
    }),
  );
}

/** A loan written directly, as Phase 8 approval will. */
async function loan(
  t: T,
  listingId: Id<"listings">,
  borrowerId: Id<"users">,
  status: Status,
  startDate: string,
  endDate: string,
) {
  return t.run(async (ctx) => {
    const listing = await ctx.db.get(listingId);
    return ctx.db.insert("borrowRequests", {
      listingId,
      ownerId: listing!.ownerId,
      borrowerId,
      startDate,
      endDate,
      status,
      createdAt: 1,
      updatedAt: 1,
    });
  });
}

async function setup() {
  const t = convexTest(schema, modules);
  const owner = await member(t, "olive");
  const borrower = await member(t, "bruno");
  const other = await member(t, "carla");
  const ownerId = await userId(t, "olive");
  const borrowerId = await userId(t, "bruno");
  const listingId = await listingOf(t, ownerId);
  return { t, owner, borrower, other, ownerId, borrowerId, listingId };
}

async function rows(t: T) {
  return t.run((ctx) => ctx.db.query("borrowRequests").collect());
}

const code = (c: string) =>
  expect.objectContaining({ data: expect.objectContaining({ code: c }) });

async function expectCode(promise: Promise<unknown>, c: string) {
  await expect(promise).rejects.toEqual(code(c));
}

describe("who may request", () => {
  it("rejects signed-out callers", async () => {
    const { t, listingId } = await setup();
    await expectCode(
      t.mutation(api.borrowRequests.create, request(listingId)),
      "UNAUTHENTICATED",
    );
    expect(await rows(t)).toHaveLength(0);
  });

  it("rejects seed-shaped identities and disabled members", async () => {
    const { t, listingId, borrowerId } = await setup();
    const seedLike = t.withIdentity({
      ...identity("x"),
      subject: "seed:marc",
    });
    await expectCode(
      seedLike.mutation(api.borrowRequests.create, request(listingId)),
      "NO_PROFILE",
    );
    await t.run((ctx) => ctx.db.patch(borrowerId, { disabledAt: 1 }));
    const bruno = t.withIdentity(identity("bruno"));
    await expectCode(
      bruno.mutation(api.borrowRequests.create, request(listingId)),
      "FORBIDDEN",
    );
  });

  it("does not let owners request their own listing", async () => {
    const { t, owner, listingId } = await setup();
    await expectCode(
      owner.mutation(api.borrowRequests.create, request(listingId)),
      "OWN_LISTING",
    );
    expect(await rows(t)).toHaveLength(0);
  });

  it("refuses archived, removed and unknown listings, and disabled owners", async () => {
    const { t, borrower, ownerId, listingId } = await setup();
    const archived = await listingOf(t, ownerId, { status: "archived" });
    const removed = await listingOf(t, ownerId, { status: "removed" });
    for (const id of [archived, removed]) {
      await expectCode(
        borrower.mutation(api.borrowRequests.create, request(id)),
        "NOT_FOUND",
      );
    }
    await t.run((ctx) => ctx.db.delete(archived));
    await expectCode(
      borrower.mutation(api.borrowRequests.create, request(archived)),
      "NOT_FOUND",
    );
    await t.run((ctx) => ctx.db.patch(ownerId, { disabledAt: 1 }));
    await expectCode(
      borrower.mutation(api.borrowRequests.create, request(listingId)),
      "NOT_FOUND",
    );
    expect(await rows(t)).toHaveLength(0);
  });

  it("refuses demo listings and listings of demo owners", async () => {
    const { t, borrower } = await setup();
    const seedOwner = await t.run((ctx) =>
      ctx.db.insert("users", {
        clerkId: "seed:marc",
        seedKey: "marc",
        name: "Marc Soler",
        role: "user",
        isTrustedLender: false,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    const demo = await listingOf(t, seedOwner, { seedKey: "projector" });
    const demoOwnerOnly = await listingOf(t, seedOwner);
    for (const id of [demo, demoOwnerOnly]) {
      await expectCode(
        borrower.mutation(api.borrowRequests.create, request(id)),
        "UNAVAILABLE",
      );
      expect(
        await t.query(api.borrowRequests.forListing, { listingId: id }),
      ).toEqual({ requestable: "demo", pending: [] });
    }
    expect(await rows(t)).toHaveLength(0);
  });
});

describe("what is stored", () => {
  it("takes owner, borrower and status from the server", async () => {
    const { t, borrower, ownerId, borrowerId, listingId } = await setup();
    const id = await borrower.mutation(
      api.borrowRequests.create,
      request(listingId, "2026-12-01", "2026-12-04", {
        timeZone: "Asia/Kolkata",
        message: "  Hi Olive, for a weekend project.  ",
      }),
    );
    const [row] = await rows(t);
    expect(row).toMatchObject({
      _id: id,
      listingId,
      ownerId,
      borrowerId,
      status: "pending",
      startDate: "2026-12-01",
      endDate: "2026-12-04",
      // Stored as the canonical name of the declared zone.
      timeZone: "Asia/Calcutta",
      message: "Hi Olive, for a weekend project.",
    });
  });

  it("rejects extra arguments such as an owner or status", async () => {
    const { borrower, ownerId, listingId } = await setup();
    await expect(
      borrower.mutation(api.borrowRequests.create, {
        ...request(listingId),
        ownerId,
        status: "approved",
      } as unknown as ReturnType<typeof request>),
    ).rejects.toThrow(/extra field|Validator|not in validator/i);
  });

  it("validates the message and the retry key", async () => {
    const { borrower, listingId } = await setup();
    await expectCode(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, undefined, undefined, { message: "x".repeat(201) }),
      ),
      "INVALID",
    );
    await expectCode(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, undefined, undefined, { message: "hi\u0000" }),
      ),
      "INVALID",
    );
    await expectCode(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, undefined, undefined, { idempotencyKey: "no" }),
      ),
      "INVALID",
    );
  });
});

describe("dates, checked against the server clock", () => {
  it.each([
    ["2026-11-27", "2026-11-28", TZ, "yesterday"],
    ["2027-02-27", "2027-02-28", TZ, "91 days ahead"],
    ["2026-12-01", "2026-12-09", TZ, "8 days"],
    ["2026-12-01", "2026-12-01", TZ, "empty range"],
    ["2026-02-31", "2026-03-02", TZ, "impossible date"],
    ["2026-12-01", "2026-12-04", "+02:00", "offset, not a zone"],
    ["2026-12-01", "2026-12-04", "Mars/Phobos", "unknown zone"],
    ["2026-11-28", "2026-11-29", "Pacific/Kiritimati", "already Nov 29 there"],
  ])("rejects %s → %s in %s (%s)", async (startDate, endDate, timeZone) => {
    const { t, borrower, listingId } = await setup();
    await expectCode(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, startDate, endDate, { timeZone }),
      ),
      "INVALID_DATES",
    );
    expect(await rows(t)).toHaveLength(0);
  });

  it.each([
    ["2026-11-28", "2026-11-29", TZ, "today"],
    ["2027-02-26", "2027-02-27", TZ, "90 days ahead"],
    ["2026-12-01", "2026-12-08", TZ, "7 days"],
    ["2026-11-27", "2026-11-28", "Etc/GMT+12", "still Nov 27 at UTC−12"],
  ])("accepts %s → %s in %s (%s)", async (startDate, endDate, timeZone) => {
    const { borrower, listingId } = await setup();
    await expect(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, startDate, endDate, { timeZone }),
      ),
    ).resolves.toBeTruthy();
  });

  it("rolls over at the borrower's local midnight", async () => {
    const { borrower, listingId } = await setup();
    const today = request(listingId, "2026-11-28", "2026-11-29");
    vi.setSystemTime(new Date("2026-11-28T23:00:00Z")); // 00:00 in Brussels
    await expectCode(
      borrower.mutation(api.borrowRequests.create, today),
      "INVALID_DATES",
    );
  });
});

describe("availability", () => {
  it.each<Status>([
    "approved",
    "ready_for_pickup",
    "borrowed",
    "overdue",
    "return_pending",
  ])("a %s loan blocks overlapping dates", async (status) => {
    const { t, borrower, listingId } = await setup();
    await loan(
      t,
      listingId,
      await userId(t, "carla"),
      status,
      "2026-12-02",
      "2026-12-05",
    );
    await expectCode(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, "2026-12-04", "2026-12-06"),
      ),
      "DATES_UNAVAILABLE",
    );
    // Back-to-back dates are free: [Dec 5, Dec 7) starts when the loan ends.
    await expect(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, "2026-12-05", "2026-12-07"),
      ),
    ).resolves.toBeTruthy();
  });

  it.each<Status>(["pending", "returned", "declined", "cancelled"])(
    "a %s request does not block other borrowers",
    async (status) => {
      const { t, borrower, listingId } = await setup();
      await loan(
        t,
        listingId,
        await userId(t, "carla"),
        status,
        "2026-12-01",
        "2026-12-04",
      );
      await expect(
        borrower.mutation(api.borrowRequests.create, request(listingId)),
      ).resolves.toBeTruthy();
    },
  );

  it("returns booked ranges only, as dates", async () => {
    const { t, listingId } = await setup();
    const carla = await userId(t, "carla");
    await loan(t, listingId, carla, "approved", "2026-12-10", "2026-12-12");
    await loan(t, listingId, carla, "borrowed", "2026-12-01", "2026-12-03");
    await loan(t, listingId, carla, "pending", "2026-12-20", "2026-12-22");
    await loan(t, listingId, carla, "cancelled", "2026-12-24", "2026-12-26");
    const ranges = await t.query(api.borrowRequests.availability, {
      listingId,
    });
    expect(ranges).toEqual([
      { startDate: "2026-12-01", endDate: "2026-12-03" },
      { startDate: "2026-12-10", endDate: "2026-12-12" },
    ]);
    for (const range of ranges) {
      expect(Object.keys(range).sort()).toEqual(["endDate", "startDate"]);
    }
  });

  it("returns nothing for listings that are not active", async () => {
    const { t, ownerId } = await setup();
    const archived = await listingOf(t, ownerId, { status: "archived" });
    await loan(
      t,
      archived,
      await userId(t, "carla"),
      "approved",
      "2026-12-01",
      "2026-12-03",
    );
    expect(
      await t.query(api.borrowRequests.availability, { listingId: archived }),
    ).toEqual([]);
  });

  it("exposes the conflict check Phase 8 approval will reuse", async () => {
    const { t, listingId } = await setup();
    const carla = await userId(t, "carla");
    const held = await loan(
      t,
      listingId,
      carla,
      "approved",
      "2026-12-01",
      "2026-12-04",
    );
    await t.run(async (ctx) => {
      expect(
        (await findBlockingConflict(ctx, listingId, "2026-12-03", "2026-12-05"))
          ?._id,
      ).toBe(held);
      // Approving the same request must not conflict with itself.
      expect(
        await findBlockingConflict(
          ctx,
          listingId,
          "2026-12-01",
          "2026-12-04",
          held,
        ),
      ).toBeNull();
    });
  });
});

describe("duplicates, retries and parallel requests", () => {
  it("returns the same request when a send is retried", async () => {
    const { t, borrower, listingId } = await setup();
    const args = request(listingId);
    const first = await borrower.mutation(api.borrowRequests.create, args);
    const again = await borrower.mutation(api.borrowRequests.create, args);
    expect(again).toBe(first);
    expect(await rows(t)).toHaveLength(1);
  });

  it("refuses a retry key reused for different dates", async () => {
    const { borrower, listingId } = await setup();
    const args = request(listingId);
    await borrower.mutation(api.borrowRequests.create, args);
    await expectCode(
      borrower.mutation(api.borrowRequests.create, {
        ...args,
        startDate: "2026-12-10",
        endDate: "2026-12-11",
      }),
      "INVALID",
    );
  });

  it("refuses a second open request by the same borrower for overlapping dates", async () => {
    const { t, borrower, listingId } = await setup();
    await borrower.mutation(api.borrowRequests.create, request(listingId));
    await expectCode(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, "2026-12-03", "2026-12-05"),
      ),
      "DUPLICATE",
    );
    // Different, non-overlapping dates are a separate request.
    await borrower.mutation(
      api.borrowRequests.create,
      request(listingId, "2026-12-10", "2026-12-12"),
    );
    expect(await rows(t)).toHaveLength(2);
  });

  it("creates exactly one request from parallel sends by one borrower", async () => {
    const { t, borrower, listingId } = await setup();
    const results = await Promise.allSettled([
      borrower.mutation(api.borrowRequests.create, request(listingId)),
      borrower.mutation(api.borrowRequests.create, request(listingId)),
      borrower.mutation(api.borrowRequests.create, request(listingId)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await rows(t)).toHaveLength(1);
  });

  it("creates one row from parallel retries with the same key", async () => {
    const { t, borrower, listingId } = await setup();
    const args = request(listingId);
    const [a, b] = await Promise.all([
      borrower.mutation(api.borrowRequests.create, args),
      borrower.mutation(api.borrowRequests.create, args),
    ]);
    expect(a).toBe(b);
    expect(await rows(t)).toHaveLength(1);
  });

  it("lets two borrowers send overlapping pending requests in parallel", async () => {
    const { t, borrower, other, listingId } = await setup();
    await Promise.all([
      borrower.mutation(api.borrowRequests.create, request(listingId)),
      other.mutation(api.borrowRequests.create, request(listingId)),
    ]);
    expect(await rows(t)).toHaveLength(2);
  });

  it("refuses every parallel send that overlaps an approved loan", async () => {
    const { t, borrower, other, listingId } = await setup();
    await member(t, "dave");
    await loan(
      t,
      listingId,
      await userId(t, "dave"),
      "approved",
      "2026-12-01",
      "2026-12-04",
    );
    const results = await Promise.allSettled([
      borrower.mutation(api.borrowRequests.create, request(listingId)),
      other.mutation(api.borrowRequests.create, request(listingId)),
    ]);
    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(await rows(t)).toHaveLength(1);
  });

  it(`allows at most ${PENDING_REQUESTS_MAX} open requests per borrower`, async () => {
    const { t, borrower, borrowerId, ownerId } = await setup();
    const elsewhere = await listingOf(t, ownerId);
    for (let i = 0; i < PENDING_REQUESTS_MAX; i++) {
      const day = String(i + 1).padStart(2, "0");
      await loan(
        t,
        elsewhere,
        borrowerId,
        "pending",
        `2027-01-${day}`,
        `2027-01-${String(i + 2).padStart(2, "0")}`,
      );
    }
    const listingId = await listingOf(t, ownerId);
    await expectCode(
      borrower.mutation(api.borrowRequests.create, request(listingId)),
      "LIMIT_REACHED",
    );
    // Cancelled requests don't count.
    await t.run(async (ctx) => {
      const one = await ctx.db
        .query("borrowRequests")
        .withIndex("by_borrower_and_status", (q) =>
          q.eq("borrowerId", borrowerId).eq("status", "pending"),
        )
        .first();
      await ctx.db.patch(one!._id, { status: "cancelled" });
    });
    await expect(
      borrower.mutation(api.borrowRequests.create, request(listingId)),
    ).resolves.toBeTruthy();
  });
});

describe("reading requests", () => {
  it("shows each member only their own requests, with the short owner view", async () => {
    const { t, borrower, other, owner, listingId } = await setup();
    await borrower.mutation(
      api.borrowRequests.create,
      request(listingId, undefined, undefined, { message: "Thanks!" }),
    );
    await other.mutation(
      api.borrowRequests.create,
      request(listingId, "2026-12-10", "2026-12-11"),
    );

    const mine = await borrower.query(api.borrowRequests.mine, {});
    expect(mine).toHaveLength(1);
    const [row] = mine;
    expect(row).toMatchObject({
      status: "pending",
      startDate: "2026-12-01",
      endDate: "2026-12-04",
      message: "Thanks!",
      cancelledBy: null,
      cancelReason: null,
      listing: {
        id: listingId,
        name: "Step Ladder",
        locationLabel: "Patershol, Gent",
        photo: null,
        active: true,
      },
    });
    // Owner: members-only short view, never IDs, full name or email.
    expect(row!.owner).toEqual({
      profileId: expect.any(String),
      displayName: "Olive T.",
      imageUrl: null,
    });
    const json = JSON.stringify(row);
    expect(json).not.toContain("Olive Tester");
    expect(Object.keys(row!)).not.toContain("ownerId");
    expect(Object.keys(row!)).not.toContain("borrowerId");

    expect(await owner.query(api.borrowRequests.mine, {})).toEqual([]);
    expect(await t.query(api.borrowRequests.mine, {})).toEqual([]);
  });

  it("tells the product page who may request and what is pending", async () => {
    const { t, borrower, other, owner, listingId } = await setup();
    const id = await borrower.mutation(
      api.borrowRequests.create,
      request(listingId),
    );
    expect(
      await borrower.query(api.borrowRequests.forListing, { listingId }),
    ).toEqual({
      requestable: "yes",
      pending: [{ id, startDate: "2026-12-01", endDate: "2026-12-04" }],
    });
    expect(
      await other.query(api.borrowRequests.forListing, { listingId }),
    ).toEqual({ requestable: "yes", pending: [] });
    expect(
      await owner.query(api.borrowRequests.forListing, { listingId }),
    ).toEqual({ requestable: "own", pending: [] });
    expect(await t.query(api.borrowRequests.forListing, { listingId })).toEqual(
      {
        requestable: "yes",
        pending: [],
      },
    );
  });
});

describe("cancelling", () => {
  it("lets the borrower cancel a pending request once", async () => {
    const { borrower, listingId } = await setup();
    const id = await borrower.mutation(
      api.borrowRequests.create,
      request(listingId),
    );
    await borrower.mutation(api.borrowRequests.cancel, { id });
    const [row] = await borrower.query(api.borrowRequests.mine, {});
    expect(row).toMatchObject({
      status: "cancelled",
      cancelledBy: "you",
      cancelReason: null,
      cancelledAt: expect.any(Number),
    });
    await expectCode(
      borrower.mutation(api.borrowRequests.cancel, { id }),
      "NOT_CANCELLABLE",
    );
    // The dates are free for a new request again.
    await expect(
      borrower.mutation(api.borrowRequests.create, request(listingId)),
    ).resolves.toBeTruthy();
  });

  it("refuses other people and non-pending requests", async () => {
    const { t, borrower, other, owner, listingId, borrowerId } = await setup();
    const id = await borrower.mutation(
      api.borrowRequests.create,
      request(listingId),
    );
    await expectCode(
      other.mutation(api.borrowRequests.cancel, { id }),
      "NOT_FOUND",
    );
    await expectCode(
      owner.mutation(api.borrowRequests.cancel, { id }),
      "NOT_FOUND",
    );
    await expectCode(
      t.mutation(api.borrowRequests.cancel, { id }),
      "UNAUTHENTICATED",
    );
    const approved = await loan(
      t,
      listingId,
      borrowerId,
      "approved",
      "2026-12-20",
      "2026-12-22",
    );
    await expectCode(
      borrower.mutation(api.borrowRequests.cancel, { id: approved }),
      "NOT_CANCELLABLE",
    );
  });
});

describe("archiving a listing", () => {
  it("cancels its pending requests with reason listing_archived", async () => {
    const { t, owner, borrower, other, listingId, borrowerId } = await setup();
    await borrower.mutation(api.borrowRequests.create, request(listingId));
    await other.mutation(api.borrowRequests.create, request(listingId));
    const declined = await loan(
      t,
      listingId,
      borrowerId,
      "declined",
      "2026-12-20",
      "2026-12-22",
    );

    await owner.mutation(api.myListings.archive, { id: listingId });

    const all = await rows(t);
    const ownerId = await userId(t, "olive");
    for (const row of all.filter((r) => r._id !== declined)) {
      expect(row).toMatchObject({
        status: "cancelled",
        cancelReason: "listing_archived",
        cancelledBy: ownerId,
      });
    }
    expect(all.find((r) => r._id === declined)?.status).toBe("declined");

    const mine = (await borrower.query(api.borrowRequests.mine, {})).find(
      (r) => r.status === "cancelled",
    );
    expect(mine).toMatchObject({
      status: "cancelled",
      cancelledBy: "owner",
      cancelReason: "listing_archived",
      listing: { active: false },
    });
    await expectCode(
      borrower.mutation(
        api.borrowRequests.create,
        request(listingId, "2026-12-10", "2026-12-11"),
      ),
      "NOT_FOUND",
    );
  });

  it("is still refused while the item is on loan", async () => {
    const { t, owner, listingId, borrowerId } = await setup();
    await loan(
      t,
      listingId,
      borrowerId,
      "borrowed",
      "2026-11-27",
      "2026-11-30",
    );
    await expectCode(
      owner.mutation(api.myListings.archive, { id: listingId }),
      "ON_LOAN",
    );
  });
});
