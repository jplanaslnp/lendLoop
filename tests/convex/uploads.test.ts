// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "@convex/_generated/api";
import {
  PENDING_UPLOAD_TTL_MS,
  PENDING_UPLOADS_MAX,
  PHOTO_MAX_BYTES,
} from "@convex/lib/listingRules";
import schema from "@convex/schema";

import {
  fixture,
  identity,
  member,
  modules,
  ORIGIN,
  postPhoto,
  uploadPhoto,
  validListing,
} from "./helpers";

beforeEach(() => {
  vi.stubEnv("APP_ORIGINS", `${ORIGIN},https://lendloop.example`);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function storedFiles(t: ReturnType<typeof convexTest>) {
  return t.run(
    async (ctx) => (await ctx.db.system.query("_storage").collect()).length,
  );
}

describe("POST /photos — who may upload", () => {
  it("rejects signed-out callers and stores nothing", async () => {
    const t = convexTest(schema, modules);
    const response = await postPhoto(t, fixture("pixel.jpg"));
    expect(response.status).toBe(401);
    expect(await storedFiles(t)).toBe(0);
  });

  it("rejects a signed-in user without a profile, a disabled user and a seed identity", async () => {
    const t = convexTest(schema, modules);
    const noProfile = t.withIdentity(identity("ghost"));
    expect((await postPhoto(noProfile, fixture("pixel.jpg"))).status).toBe(403);

    const disabled = await member(t, "dora");
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", "user_dora"))
        .unique();
      await ctx.db.patch(row!._id, { disabledAt: Date.now() });
    });
    expect((await postPhoto(disabled, fixture("pixel.jpg"))).status).toBe(403);

    const seed = t.withIdentity({ subject: "seed:marc" });
    expect((await postPhoto(seed, fixture("pixel.jpg"))).status).toBe(403);
    expect(await storedFiles(t)).toBe(0);
  });

  it("refuses other sites but answers the app's preflight", async () => {
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    const evil = await postPhoto(alice, fixture("pixel.jpg"), {
      Origin: "https://evil.example",
    });
    expect(evil.status).toBe(403);
    expect(evil.headers.get("Access-Control-Allow-Origin")).toBeNull();

    const preflight = await t.fetch("/photos", {
      method: "OPTIONS",
      headers: { Origin: ORIGIN },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(await storedFiles(t)).toBe(0);
  });
});

describe("POST /photos — what may be uploaded", () => {
  it.each([
    ["pixel.jpg", "jpeg", "image/jpeg"],
    ["pixel.png", "png", "image/png"],
    ["pixel.webp", "webp", "image/webp"],
  ])("accepts a real %s and stores it as %s", async (file, format, type) => {
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    // The browser's claimed type is ignored: always claim JPEG here.
    const uploadId = await uploadPhoto(alice, file);
    const stored = await t.run(async (ctx) => {
      const upload = await ctx.db.get(uploadId);
      const meta = await ctx.db.system.get(upload!.storageId);
      return { upload, contentType: meta?.contentType };
    });
    expect(stored.upload).toMatchObject({ format, status: "pending" });
    expect(stored.contentType).toBe(type);
  });

  it.each(["fake-html.jpg", "fake.pdf", "fake.svg"])(
    "rejects %s by its content and stores nothing",
    async (file) => {
      const t = convexTest(schema, modules);
      const alice = await member(t, "alice");
      const response = await postPhoto(alice, fixture(file), {
        "Content-Type": "image/jpeg",
      });
      expect(response.status).toBe(415);
      expect(await response.json()).toMatchObject({
        error: { code: "UNSUPPORTED_FORMAT" },
      });
      expect(await storedFiles(t)).toBe(0);
    },
  );

  it("rejects files over 5 MB, even with a false Content-Length", async () => {
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set(fixture("pixel.jpg").subarray(0, 3));

    const declared = await postPhoto(alice, big);
    expect(declared.status).toBe(413);
    const lied = await postPhoto(alice, big, { "Content-Length": "1000" });
    expect(lied.status).toBe(413);

    const exact = new Uint8Array(PHOTO_MAX_BYTES);
    exact.set(fixture("pixel.jpg").subarray(0, 3));
    expect((await postPhoto(alice, exact)).status).toBe(201);
    expect(await storedFiles(t)).toBe(1);
  });

  it("rejects an empty body", async () => {
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    expect((await postPhoto(alice, new Uint8Array())).status).toBe(400);
  });
});

describe("pending upload limit", () => {
  it(`allows ${PENDING_UPLOADS_MAX} unattached photos per user, then refuses`, async () => {
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    const bob = await member(t, "bob");
    for (let i = 0; i < PENDING_UPLOADS_MAX; i++) await uploadPhoto(alice);
    const refused = await postPhoto(alice, fixture("pixel.jpg"));
    expect(refused.status).toBe(429);
    expect(await storedFiles(t)).toBe(PENDING_UPLOADS_MAX);
    // Other users are unaffected.
    await uploadPhoto(bob);

    // Attaching photos to a listing frees slots.
    const me = await alice.query(api.users.current, {});
    const mine = await t.run((ctx) =>
      ctx.db
        .query("uploads")
        .withIndex("by_owner_and_status", (q) =>
          q.eq("ownerId", me!.id).eq("status", "pending"),
        )
        .take(4),
    );
    await alice.mutation(
      api.myListings.create,
      validListing(mine.map((u) => u._id)),
    );
    await uploadPhoto(alice);
  });

  it("re-checks the limit when recording, deleting the losing file", async () => {
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    for (let i = 0; i < PENDING_UPLOADS_MAX; i++) await uploadPhoto(alice);
    // Simulate a parallel upload that passed the first check: the file is
    // stored, then the transactional record step refuses and deletes it.
    const result = await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(
        new Blob([fixture("pixel.jpg")]),
      );
      return storageId;
    });
    const recorded = await alice.mutation(internal.uploads.record, {
      storageId: result,
      format: "jpeg",
      size: 10,
    });
    expect(recorded).toEqual({ ok: false, code: "TOO_MANY_PENDING" });
    expect(await storedFiles(t)).toBe(PENDING_UPLOADS_MAX);
  });
});

describe("daily cleanup", () => {
  it("deletes only pending uploads older than 24 hours", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    const attachedIds = [await uploadPhoto(alice), await uploadPhoto(alice)];
    const listingId = await alice.mutation(
      api.myListings.create,
      validListing(attachedIds),
    );
    const oldPending = await uploadPhoto(alice);

    vi.advanceTimersByTime(PENDING_UPLOAD_TTL_MS + 1000);
    const freshPending = await uploadPhoto(alice);

    const result = await t.mutation(internal.uploads.cleanupPendingUploads, {});
    expect(result).toEqual({ deleted: 1, more: false });

    const left = await t.run((ctx) => ctx.db.query("uploads").collect());
    expect(left.map((u) => u._id).sort()).toEqual(
      [...attachedIds, freshPending].sort(),
    );
    expect(left.some((u) => u._id === oldPending)).toBe(false);
    expect(await storedFiles(t)).toBe(3);
    // The listing still shows both photos.
    const detail = await t.query(api.listings.get, { id: listingId });
    expect(detail?.photos).toHaveLength(2);
  });

  it("never deletes retained photos or photos of archived listings", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const alice = await member(t, "alice");
    const first = await uploadPhoto(alice);
    const second = await uploadPhoto(alice);
    const listingId = await alice.mutation(
      api.myListings.create,
      validListing([first, second]),
    );
    // Give the listing loan history, then remove a photo and archive it.
    await t.run(async (ctx) => {
      const listing = await ctx.db.get(listingId);
      await ctx.db.insert("borrowRequests", {
        listingId,
        ownerId: listing!.ownerId,
        borrowerId: listing!.ownerId,
        startDate: "2026-12-01",
        endDate: "2026-12-02",
        status: "returned",
        createdAt: 0,
        updatedAt: 0,
      });
    });
    await alice.mutation(api.myListings.update, {
      id: listingId,
      ...validListing([first]),
    });
    await alice.mutation(api.myListings.archive, { id: listingId });

    vi.advanceTimersByTime(PENDING_UPLOAD_TTL_MS * 3);
    await t.mutation(internal.uploads.cleanupPendingUploads, {});

    const uploads = await t.run((ctx) => ctx.db.query("uploads").collect());
    expect(uploads.map((u) => u.status).sort()).toEqual([
      "attached",
      "retained",
    ]);
    expect(await storedFiles(t)).toBe(2);
  });
});
