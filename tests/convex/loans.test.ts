// @vitest-environment edge-runtime
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { startOfDayIn } from "@convex/lib/requestRules";
import schema from "@convex/schema";

import { member, modules, type Member } from "./helpers";

/**
 * Loan lifecycle (Phase 8). The clock is fixed at 2026-11-28 10:00 UTC
 * (11:00 in Brussels).
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
const key = () => `loan-${(++keySeq).toString().padStart(8, "0")}`;

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

/** A request created through the real Phase 7 mutation. */
function ask(
  who: Member,
  listingId: Id<"listings">,
  startDate = "2026-12-01",
  endDate = "2026-12-04",
  extra: { timeZone?: string; message?: string } = {},
) {
  return who.mutation(api.borrowRequests.create, {
    listingId,
    startDate,
    endDate,
    timeZone: TZ,
    idempotencyKey: key(),
    ...extra,
  });
}

/** A request row written directly in a given state (for setup only). */
async function row(
  t: T,
  listingId: Id<"listings">,
  borrowerId: Id<"users">,
  status: Status,
  startDate: string,
  endDate: string,
  extra: Partial<Doc<"borrowRequests">> = {},
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
      timeZone: TZ,
      createdAt: 1,
      updatedAt: 1,
      ...extra,
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
  const otherId = await userId(t, "carla");
  const listingId = await listingOf(t, ownerId);
  return { t, owner, borrower, other, ownerId, borrowerId, otherId, listingId };
}

const getRequest = (t: T, id: Id<"borrowRequests">) =>
  t.run((ctx) => ctx.db.get(id));

const eventsOf = (t: T, id: Id<"borrowRequests">) =>
  t.run(async (ctx) =>
    (
      await ctx.db
        .query("requestEvents")
        .withIndex("by_request", (q) => q.eq("requestId", id))
        .collect()
    ).sort((a, b) => a.at - b.at || a._creationTime - b._creationTime),
  );

async function expectCode(promise: Promise<unknown>, c: string) {
  await expect(promise).rejects.toEqual(
    expect.objectContaining({ data: expect.objectContaining({ code: c }) }),
  );
}

describe("incoming requests (Lending)", () => {
  it("shows owners the requests for their listings, and nobody else", async () => {
    const { t, owner, borrower, other, listingId } = await setup();
    await ask(borrower, listingId, undefined, undefined, {
      message: "For the attic.",
    });

    const incoming = await owner.query(api.loans.incoming, {});
    expect(incoming).toHaveLength(1);
    expect(incoming[0]).toMatchObject({
      status: "pending",
      startDate: "2026-12-01",
      endDate: "2026-12-04",
      message: "For the attic.",
      borrower: { displayName: "Bruno T.", imageUrl: null },
      listing: { id: listingId, name: "Step Ladder", active: true },
      history: [{ from: null, to: "pending", by: "borrower", reason: null }],
    });
    // Short name only; no user IDs, emails or full names.
    const json = JSON.stringify(incoming[0]);
    expect(json).not.toContain("Bruno Tester");
    expect(Object.keys(incoming[0]!)).not.toContain("borrowerId");
    expect(Object.keys(incoming[0]!)).not.toContain("pickupNote");

    expect(await other.query(api.loans.incoming, {})).toEqual([]);
    expect(await borrower.query(api.loans.incoming, {})).toEqual([]);
    expect(await t.query(api.loans.incoming, {})).toEqual([]);
  });
});

describe("who may approve and decline", () => {
  it("refuses guests, unrelated members, admins and the borrower", async () => {
    const { t, borrower, other, listingId } = await setup();
    const id = await ask(borrower, listingId);
    const admin = await member(t, "dave");
    const adminId = await userId(t, "dave");
    await t.run((ctx) => ctx.db.patch(adminId, { role: "admin" }));

    for (const name of ["approve", "decline"] as const) {
      await expectCode(t.mutation(api.loans[name], { id }), "UNAUTHENTICATED");
      await expectCode(other.mutation(api.loans[name], { id }), "NOT_FOUND");
      // Phase 8: admins act only as members.
      await expectCode(admin.mutation(api.loans[name], { id }), "NOT_FOUND");
      await expectCode(
        borrower.mutation(api.loans[name], { id }),
        "NOT_ALLOWED",
      );
    }
    expect((await getRequest(t, id))?.status).toBe("pending");
    expect(await eventsOf(t, id)).toHaveLength(1);
  });

  it("lets an admin manage requests on their own listing like any owner", async () => {
    const { t, borrower } = await setup();
    const admin = await member(t, "dave");
    const adminId = await userId(t, "dave");
    await t.run((ctx) => ctx.db.patch(adminId, { role: "admin" }));
    const adminListing = await listingOf(t, adminId);
    const id = await ask(borrower, adminListing);
    await admin.mutation(api.loans.approve, { id });
    expect((await getRequest(t, id))?.status).toBe("approved");
  });

  it("rejects arguments that try to set the actor, time or status", async () => {
    const { owner, borrower, otherId, listingId } = await setup();
    const id = await ask(borrower, listingId);
    await expect(
      owner.mutation(api.loans.approve, {
        id,
        approvedBy: otherId,
        approvedAt: 1,
        status: "returned",
      } as unknown as { id: Id<"borrowRequests"> }),
    ).rejects.toThrow(/extra field|Validator|not in validator/i);
  });
});

describe("approving", () => {
  it("records the approval, the actor and the pickup note", async () => {
    const { t, owner, borrower, ownerId, listingId } = await setup();
    const id = await ask(borrower, listingId);
    await owner.mutation(api.loans.approve, {
      id,
      pickupNote: "  Ring at the blue door, after 6 pm.  ",
    });
    expect(await getRequest(t, id)).toMatchObject({
      status: "approved",
      approvedBy: ownerId,
      approvedAt: expect.any(Number),
      pickupNote: "Ring at the blue door, after 6 pm.",
    });
    const [mine] = await borrower.query(api.borrowRequests.mine, {});
    expect(mine?.pickupNote).toBe("Ring at the blue door, after 6 pm.");
    expect(mine?.history.map((e) => [e.to, e.by])).toEqual([
      ["pending", "you"],
      ["approved", "owner"],
    ]);
  });

  it("validates the pickup note", async () => {
    const { owner, borrower, listingId } = await setup();
    const id = await ask(borrower, listingId);
    await expectCode(
      owner.mutation(api.loans.approve, { id, pickupNote: "x".repeat(201) }),
      "INVALID",
    );
  });

  it("hides the pickup note before approval and after cancelling", async () => {
    const { t, borrower, listingId, borrowerId } = await setup();
    await row(t, listingId, borrowerId, "pending", "2026-12-10", "2026-12-12", {
      pickupNote: "should not leak",
    });
    await row(
      t,
      listingId,
      borrowerId,
      "cancelled",
      "2026-12-14",
      "2026-12-15",
      {
        pickupNote: "should not leak",
      },
    );
    for (const r of await borrower.query(api.borrowRequests.mine, {})) {
      expect(r.pickupNote).toBeNull();
    }
  });

  it("is refused when an active loan overlaps", async () => {
    const { t, owner, borrower, otherId, listingId } = await setup();
    const id = await ask(borrower, listingId);
    await row(t, listingId, otherId, "borrowed", "2026-12-03", "2026-12-06");
    await expectCode(
      owner.mutation(api.loans.approve, { id }),
      "DATES_UNAVAILABLE",
    );
    expect((await getRequest(t, id))?.status).toBe("pending");
  });

  it("is refused once the requested dates have passed", async () => {
    const { t, owner, borrowerId, listingId } = await setup();
    const id = await row(
      t,
      listingId,
      borrowerId,
      "pending",
      "2026-11-25",
      "2026-11-28",
    );
    await expectCode(owner.mutation(api.loans.approve, { id }), "DATES_PASSED");
  });

  it("declines overlapping pending requests in the same transaction", async () => {
    const { t, owner, borrower, other, listingId } = await setup();
    const chosen = await ask(borrower, listingId, "2026-12-01", "2026-12-04");
    const overlapping = await ask(other, listingId, "2026-12-03", "2026-12-05");
    const dave = await member(t, "dave");
    const later = await ask(dave, listingId, "2026-12-04", "2026-12-06");

    await owner.mutation(api.loans.approve, { id: chosen });

    expect((await getRequest(t, chosen))?.status).toBe("approved");
    expect(await getRequest(t, overlapping)).toMatchObject({
      status: "declined",
      declineReason: "dates_taken",
    });
    // Starts on the day the approved loan ends: no overlap, still pending.
    expect((await getRequest(t, later))?.status).toBe("pending");
    const events = await eventsOf(t, overlapping);
    expect(events.at(-1)).toMatchObject({
      from: "pending",
      to: "declined",
      actor: "system",
      reason: "dates_taken",
    });
    expect(events.at(-1)?.actorId).toBeUndefined();
  });

  it("never creates two overlapping loans from concurrent approvals", async () => {
    const { t, owner, borrower, other, listingId } = await setup();
    const a = await ask(borrower, listingId, "2026-12-01", "2026-12-04");
    const b = await ask(other, listingId, "2026-12-02", "2026-12-05");
    const results = await Promise.allSettled([
      owner.mutation(api.loans.approve, { id: a }),
      owner.mutation(api.loans.approve, { id: b }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const statuses = [
      (await getRequest(t, a))?.status,
      (await getRequest(t, b))?.status,
    ].sort();
    expect(statuses).toEqual(["approved", "declined"]);
  });
});

describe("declining", () => {
  it("records who declined and keeps the request", async () => {
    const { t, owner, borrower, ownerId, listingId } = await setup();
    const id = await ask(borrower, listingId);
    await owner.mutation(api.loans.decline, { id });
    expect(await getRequest(t, id)).toMatchObject({
      status: "declined",
      declinedBy: ownerId,
      declinedAt: expect.any(Number),
    });
    await expectCode(
      owner.mutation(api.loans.decline, { id }),
      "INVALID_TRANSITION",
    );
    expect(await eventsOf(t, id)).toHaveLength(2);
  });
});

describe("pickup and return", () => {
  it("runs the whole lifecycle with the right actors and history", async () => {
    const { t, owner, borrower, ownerId, borrowerId, listingId } =
      await setup();
    const id = await ask(borrower, listingId);
    await owner.mutation(api.loans.approve, { id });
    await owner.mutation(api.loans.markReady, { id });
    await borrower.mutation(api.loans.confirmPickup, { id });
    expect(await getRequest(t, id)).toMatchObject({
      status: "borrowed",
      pickedUpAt: expect.any(Number),
      // Overdue from the start of Dec 4 in Brussels (= Dec 3, 23:00 UTC).
      dueAt: Date.parse("2026-12-03T23:00:00Z"),
    });
    await borrower.mutation(api.loans.markReturned, { id });
    await owner.mutation(api.loans.confirmReturn, { id });
    expect(await getRequest(t, id)).toMatchObject({
      status: "returned",
      returnedAt: expect.any(Number),
    });

    const events = await eventsOf(t, id);
    expect(
      events.map((e) => [e.from, e.to, e.actor, e.actorId ?? null]),
    ).toEqual([
      [null, "pending", "borrower", borrowerId],
      ["pending", "approved", "owner", ownerId],
      ["approved", "ready_for_pickup", "owner", ownerId],
      ["ready_for_pickup", "borrowed", "borrower", borrowerId],
      ["borrowed", "return_pending", "borrower", borrowerId],
      ["return_pending", "returned", "owner", ownerId],
    ]);
    // Server time, never client-supplied.
    for (const e of events) expect(e.at).toBeGreaterThanOrEqual(NOW.getTime());
  });

  it("refuses steps by the wrong person", async () => {
    const { t, owner, borrower, listingId, borrowerId } = await setup();
    const ready = await row(
      t,
      listingId,
      borrowerId,
      "ready_for_pickup",
      "2026-12-01",
      "2026-12-04",
    );
    await expectCode(
      owner.mutation(api.loans.confirmPickup, { id: ready }),
      "NOT_ALLOWED",
    );
    const borrowed = await row(
      t,
      listingId,
      borrowerId,
      "borrowed",
      "2026-12-10",
      "2026-12-12",
    );
    await expectCode(
      owner.mutation(api.loans.markReturned, { id: borrowed }),
      "NOT_ALLOWED",
    );
    await expectCode(
      borrower.mutation(api.loans.confirmReturn, { id: borrowed }),
      "NOT_ALLOWED",
    );
    await expectCode(
      borrower.mutation(api.loans.markReady, { id: ready }),
      "NOT_ALLOWED",
    );
  });

  it.each<[keyof typeof api.loans, Status, "owner" | "borrower"]>([
    ["markReady", "pending", "owner"],
    ["confirmPickup", "approved", "borrower"],
    ["markReturned", "ready_for_pickup", "borrower"],
    ["markReturned", "return_pending", "borrower"],
    ["confirmReturn", "approved", "owner"],
    ["confirmReturn", "returned", "owner"],
    ["approve", "approved", "owner"],
    ["decline", "cancelled", "owner"],
    ["markReady", "ready_for_pickup", "owner"],
  ])("refuses %s from %s", async (name, status, who) => {
    const { t, owner, borrower, listingId, borrowerId } = await setup();
    const id = await row(
      t,
      listingId,
      borrowerId,
      status,
      "2026-12-01",
      "2026-12-04",
    );
    const actor = who === "owner" ? owner : borrower;
    await expectCode(
      actor.mutation(api.loans[name] as typeof api.loans.markReady, { id }),
      "INVALID_TRANSITION",
    );
    expect((await getRequest(t, id))?.status).toBe(status);
    expect(await eventsOf(t, id)).toHaveLength(0);
  });

  it.each<Status>(["borrowed", "overdue"])(
    "lets the owner confirm a return directly from %s",
    async (status) => {
      const { t, owner, listingId, borrowerId } = await setup();
      const id = await row(
        t,
        listingId,
        borrowerId,
        status,
        "2026-11-25",
        "2026-11-28",
      );
      await owner.mutation(api.loans.confirmReturn, { id });
      expect((await getRequest(t, id))?.status).toBe("returned");
    },
  );

  it("lets either party cancel before pickup, nobody after", async () => {
    const { t, owner, borrower, listingId, borrowerId } = await setup();
    const approved = await row(
      t,
      listingId,
      borrowerId,
      "approved",
      "2026-12-01",
      "2026-12-03",
    );
    const ready = await row(
      t,
      listingId,
      borrowerId,
      "ready_for_pickup",
      "2026-12-05",
      "2026-12-07",
    );
    await borrower.mutation(api.borrowRequests.cancel, { id: approved });
    await owner.mutation(api.borrowRequests.cancel, { id: ready });
    expect((await getRequest(t, approved))?.status).toBe("cancelled");
    expect(await getRequest(t, ready)).toMatchObject({
      status: "cancelled",
      cancelledBy: await userId(t, "olive"),
    });
    const [incomingReady] = (await owner.query(api.loans.incoming, {})).filter(
      (r) => r.id === ready,
    );
    expect(incomingReady?.cancelledBy).toBe("you");
  });

  it("refuses lifecycle steps on demo listings", async () => {
    const { t, borrower, borrowerId } = await setup();
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
    const id = await row(
      t,
      demo,
      borrowerId,
      "ready_for_pickup",
      "2026-12-01",
      "2026-12-03",
    );
    await expectCode(
      borrower.mutation(api.loans.confirmPickup, { id }),
      "UNAVAILABLE",
    );
  });
});

describe("overdue", () => {
  async function pickedUp(timeZone: string, endDate: string) {
    const ctx = await setup();
    // Nov 29 is "today or later" in every zone at this instant.
    const id = await ask(ctx.borrower, ctx.listingId, "2026-11-29", endDate, {
      timeZone,
    });
    await ctx.owner.mutation(api.loans.approve, { id });
    await ctx.owner.mutation(api.loans.markReady, { id });
    await ctx.borrower.mutation(api.loans.confirmPickup, { id });
    return { ...ctx, id };
  }

  it("marks a loan overdue from the start of endDate, once", async () => {
    const { t, id } = await pickedUp(TZ, "2026-12-01");
    const due = Date.parse("2026-11-30T23:00:00Z"); // Dec 1, 00:00 Brussels
    expect((await getRequest(t, id))?.dueAt).toBe(due);

    vi.setSystemTime(due - 1);
    expect(await t.mutation(internal.loans.markOverdueLoans, {})).toBe(0);
    expect((await getRequest(t, id))?.status).toBe("borrowed");

    vi.setSystemTime(due);
    expect(await t.mutation(internal.loans.markOverdueLoans, {})).toBe(1);
    expect((await getRequest(t, id))?.status).toBe("overdue");
    const before = await eventsOf(t, id);
    expect(before.at(-1)).toMatchObject({
      from: "borrowed",
      to: "overdue",
      actor: "system",
      reason: "due_date_passed",
    });

    // Idempotent: a second run changes nothing and adds no event.
    expect(await t.mutation(internal.loans.markOverdueLoans, {})).toBe(0);
    expect(await eventsOf(t, id)).toEqual(before);
  });

  it("uses the borrower's stored time zone", async () => {
    const plus14 = await pickedUp("Pacific/Kiritimati", "2026-12-01");
    const minus12 = await pickedUp("Etc/GMT+12", "2026-12-01");
    expect((await getRequest(plus14.t, plus14.id))?.dueAt).toBe(
      Date.parse("2026-11-30T10:00:00Z"),
    );
    expect((await getRequest(minus12.t, minus12.id))?.dueAt).toBe(
      Date.parse("2026-12-01T12:00:00Z"),
    );
  });

  it("does not touch returned or return-pending loans", async () => {
    const { t, listingId, borrowerId } = await setup();
    const past = Date.parse("2026-11-20T00:00:00Z");
    const returning = await row(
      t,
      listingId,
      borrowerId,
      "return_pending",
      "2026-11-15",
      "2026-11-18",
      { dueAt: past },
    );
    expect(await t.mutation(internal.loans.markOverdueLoans, {})).toBe(0);
    expect((await getRequest(t, returning))?.status).toBe("return_pending");
  });
});

describe("due dates across time zones and DST", () => {
  it.each([
    ["2026-12-04", "Europe/Brussels", "2026-12-03T23:00:00Z"],
    // Brussels on the DST weekends: midnight is UTC+1 / UTC+2.
    ["2026-03-29", "Europe/Brussels", "2026-03-28T23:00:00Z"],
    ["2026-03-30", "Europe/Brussels", "2026-03-29T22:00:00Z"],
    ["2026-10-25", "Europe/Brussels", "2026-10-24T22:00:00Z"],
    ["2026-10-26", "Europe/Brussels", "2026-10-25T23:00:00Z"],
    ["2026-03-08", "America/New_York", "2026-03-08T05:00:00Z"],
    ["2026-03-09", "America/New_York", "2026-03-09T04:00:00Z"],
    ["2026-12-01", "Asia/Kathmandu", "2026-11-30T18:15:00Z"],
    ["2026-12-01", "UTC", "2026-12-01T00:00:00Z"],
  ])("%s starts in %s at %s", (iso, zone, expected) => {
    expect(startOfDayIn(iso, zone)).toBe(Date.parse(expected));
  });
});

describe("history", () => {
  it("is append-only: earlier events never change, failures add nothing", async () => {
    const { t, owner, borrower, listingId } = await setup();
    const id = await ask(borrower, listingId);
    const afterCreate = await eventsOf(t, id);
    await owner.mutation(api.loans.approve, { id });
    await expectCode(
      owner.mutation(api.loans.approve, { id }),
      "INVALID_TRANSITION",
    );
    await expectCode(
      borrower.mutation(api.loans.confirmPickup, { id }),
      "INVALID_TRANSITION",
    );
    const events = await eventsOf(t, id);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(afterCreate[0]);
  });

  it("is written only by these reviewed public functions", async () => {
    // Every public write goes through server-side actor/time/status checks
    // (applyTransition / recordCreated). A new one must be reviewed here.
    const writes: string[] = [];
    for (const [path, load] of Object.entries(modules)) {
      if (/auth\.config|_generated/.test(path)) continue;
      const exported = (await load()) as Record<
        string,
        { isMutation?: boolean; isAction?: boolean; isPublic?: boolean }
      >;
      for (const [name, fn] of Object.entries(exported)) {
        if (fn && (fn.isMutation || fn.isAction) && fn.isPublic) {
          writes.push(
            `${path.replace(/^.*convex\//, "").replace(/\.ts$/, "")}.${name}`,
          );
        }
      }
    }
    expect(writes.sort()).toEqual([
      "borrowRequests.cancel",
      "borrowRequests.create",
      "loans.approve",
      "loans.confirmPickup",
      "loans.confirmReturn",
      "loans.decline",
      "loans.markReady",
      "loans.markReturned",
      "myListings.archive",
      "myListings.create",
      "myListings.update",
      "users.ensureCurrent",
    ]);
  });
});

describe("archiving with loans", () => {
  it.each<Status>([
    "approved",
    "ready_for_pickup",
    "borrowed",
    "overdue",
    "return_pending",
  ])("is refused while a loan is %s", async (status) => {
    const { t, owner, listingId, borrowerId } = await setup();
    await row(t, listingId, borrowerId, status, "2026-12-01", "2026-12-04");
    await expectCode(
      owner.mutation(api.myListings.archive, { id: listingId }),
      "ON_LOAN",
    );
    const [mine] = await owner.query(api.myListings.mine, {});
    expect(mine?.activeLoan).toBe(true);
  });

  it("is allowed once loans are returned, and still cancels pending ones", async () => {
    const { t, owner, borrower, listingId, borrowerId } = await setup();
    await row(t, listingId, borrowerId, "returned", "2026-11-20", "2026-11-22");
    const pending = await ask(borrower, listingId);
    await owner.mutation(api.myListings.archive, { id: listingId });
    expect(await getRequest(t, pending)).toMatchObject({
      status: "cancelled",
      cancelReason: "listing_archived",
    });
    expect((await eventsOf(t, pending)).at(-1)).toMatchObject({
      to: "cancelled",
      actor: "owner",
      reason: "listing_archived",
    });
  });
});

describe("history backfill for requests created before Phase 8", () => {
  it("adds only established events, keeps statuses, and runs once", async () => {
    const { t, listingId, borrowerId, ownerId } = await setup();
    const created = Date.parse("2026-11-20T09:00:00Z");
    const cancelledAt = Date.parse("2026-11-21T10:00:00Z");
    const pending = await row(
      t,
      listingId,
      borrowerId,
      "pending",
      "2026-12-01",
      "2026-12-03",
      {
        createdAt: created,
      },
    );
    const byBorrower = await row(
      t,
      listingId,
      borrowerId,
      "cancelled",
      "2026-12-05",
      "2026-12-06",
      {
        createdAt: created,
        cancelledAt,
        cancelledBy: borrowerId,
      },
    );
    const archived = await row(
      t,
      listingId,
      borrowerId,
      "cancelled",
      "2026-12-08",
      "2026-12-09",
      {
        createdAt: created,
        cancelledAt,
        cancelledBy: ownerId,
        cancelReason: "listing_archived",
      },
    );
    // Missing who/when: the cancellation is not invented.
    const unknown = await row(
      t,
      listingId,
      borrowerId,
      "cancelled",
      "2026-12-10",
      "2026-12-11",
      {
        createdAt: created,
      },
    );

    const first = await t.mutation(internal.loans.backfillHistory, {});
    expect(first).toEqual({
      checked: 4,
      backfilled: 4,
      alreadyHadHistory: 0,
      incomplete: 1,
    });

    expect(await eventsOf(t, pending)).toEqual([
      expect.objectContaining({
        from: null,
        to: "pending",
        actor: "borrower",
        actorId: borrowerId,
        at: created,
        backfilled: true,
      }),
    ]);
    expect(
      (await eventsOf(t, byBorrower)).map((e) => [
        e.to,
        e.actor,
        e.at,
        e.reason ?? null,
      ]),
    ).toEqual([
      ["pending", "borrower", created, null],
      ["cancelled", "borrower", cancelledAt, null],
    ]);
    expect((await eventsOf(t, archived)).at(-1)).toMatchObject({
      to: "cancelled",
      actor: "owner",
      actorId: ownerId,
      reason: "listing_archived",
    });
    expect(await eventsOf(t, unknown)).toHaveLength(1);

    // Statuses and timestamps are untouched; a second run adds nothing.
    expect((await getRequest(t, byBorrower))?.status).toBe("cancelled");
    expect((await getRequest(t, pending))?.updatedAt).toBe(1);
    const again = await t.mutation(internal.loans.backfillHistory, {});
    expect(again).toEqual({
      checked: 4,
      backfilled: 0,
      alreadyHadHistory: 4,
      incomplete: 0,
    });
  });
});
