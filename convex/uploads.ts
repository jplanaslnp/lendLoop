import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  httpAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { getActiveMember } from "./lib/auth";
import {
  detectImageFormat,
  IMAGE_CONTENT_TYPES,
  type ImageFormat,
} from "./lib/imageFormat";
import {
  PENDING_UPLOAD_TTL_MS,
  PENDING_UPLOADS_MAX,
  PHOTO_MAX_BYTES,
} from "./lib/listingRules";

/**
 * Photo uploads (Phase 6). The browser POSTs the file to `/photos` on the
 * Convex site URL with its Clerk token. There are no pre-signed upload URLs,
 * so nothing reaches storage before these checks pass:
 *   1. the caller is a signed-in, enabled member (verified Clerk JWT);
 *   2. they have fewer than PENDING_UPLOADS_MAX unattached photos;
 *   3. the body is at most PHOTO_MAX_BYTES (header and real byte count);
 *   4. the bytes are a JPEG, PNG or WebP (signature, not MIME/filename).
 * The file is stored with the detected type, then recorded in a mutation
 * that re-checks 1–2 transactionally (and deletes the file if a parallel
 * upload won the last slot). The returned upload ID can only be attached
 * to a listing by its owner (convex/listings.ts).
 */

type UploadErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "TOO_MANY_PENDING"
  | "TOO_LARGE"
  | "EMPTY"
  | "UNSUPPORTED_FORMAT"
  | "ORIGIN_NOT_ALLOWED";

const STATUS: Record<UploadErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ORIGIN_NOT_ALLOWED: 403,
  TOO_MANY_PENDING: 429,
  TOO_LARGE: 413,
  EMPTY: 400,
  UNSUPPORTED_FORMAT: 415,
};

const MESSAGES: Record<UploadErrorCode, string> = {
  UNAUTHENTICATED: "Please sign in to upload photos.",
  FORBIDDEN: "Your account can’t upload photos.",
  ORIGIN_NOT_ALLOWED: "Uploads are not allowed from this site.",
  TOO_MANY_PENDING:
    "You have too many photos waiting to be published. Publish or wait a day, then try again.",
  TOO_LARGE: "Photos can be up to 5 MB.",
  EMPTY: "This file is empty.",
  UNSUPPORTED_FORMAT: "Use a JPEG, PNG or WebP photo.",
};

/** Origins allowed to call /photos (Convex env APP_ORIGINS, comma-separated). */
function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const allowed = (process.env.APP_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): HeadersInit {
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function fail(code: UploadErrorCode, origin: string | null) {
  return json(
    { error: { code, message: MESSAGES[code] } },
    STATUS[code],
    origin,
  );
}

/** Reads at most `limit + 1` bytes, so oversized bodies stop early. */
async function readLimited(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer> | "too_large"> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return "too_large";
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Can the caller upload right now? Same checks as `record`, read-only. */
export const uploadAllowance = internalQuery({
  args: {},
  returns: v.union(
    v.literal("ok"),
    v.literal("UNAUTHENTICATED"),
    v.literal("FORBIDDEN"),
    v.literal("TOO_MANY_PENDING"),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return "UNAUTHENTICATED";
    const member = await getActiveMember(ctx);
    if (!member) return "FORBIDDEN";
    const pending = await ctx.db
      .query("uploads")
      .withIndex("by_owner_and_status", (q) =>
        q.eq("ownerId", member._id).eq("status", "pending"),
      )
      .take(PENDING_UPLOADS_MAX);
    return pending.length >= PENDING_UPLOADS_MAX ? "TOO_MANY_PENDING" : "ok";
  },
});

/**
 * Records a stored file for the caller, re-checking membership and the
 * pending limit inside the transaction. On refusal the file is deleted.
 */
export const record = internalMutation({
  args: {
    storageId: v.id("_storage"),
    format: v.union(v.literal("jpeg"), v.literal("png"), v.literal("webp")),
    size: v.number(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), uploadId: v.id("uploads") }),
    v.object({
      ok: v.literal(false),
      code: v.union(v.literal("FORBIDDEN"), v.literal("TOO_MANY_PENDING")),
    }),
  ),
  handler: async (ctx, { storageId, format, size }) => {
    const member = await getActiveMember(ctx);
    const pending = member
      ? await ctx.db
          .query("uploads")
          .withIndex("by_owner_and_status", (q) =>
            q.eq("ownerId", member._id).eq("status", "pending"),
          )
          .take(PENDING_UPLOADS_MAX)
      : [];
    if (!member || pending.length >= PENDING_UPLOADS_MAX) {
      await ctx.storage.delete(storageId);
      return {
        ok: false as const,
        code: member ? ("TOO_MANY_PENDING" as const) : ("FORBIDDEN" as const),
      };
    }
    const uploadId = await ctx.db.insert("uploads", {
      ownerId: member._id,
      storageId,
      format,
      size,
      status: "pending",
      createdAt: Date.now(),
    });
    return { ok: true as const, uploadId };
  },
});

export const uploadPhoto = httpAction(async (ctx, request) => {
  const origin = allowedOrigin(request);
  if (request.headers.get("Origin") && !origin) {
    return fail("ORIGIN_NOT_ALLOWED", null);
  }

  const allowance = await ctx.runQuery(internal.uploads.uploadAllowance, {});
  if (allowance !== "ok") return fail(allowance, origin);

  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (declared > PHOTO_MAX_BYTES) return fail("TOO_LARGE", origin);

  const bytes = await readLimited(request, PHOTO_MAX_BYTES);
  if (bytes === "too_large") return fail("TOO_LARGE", origin);
  if (bytes.byteLength === 0) return fail("EMPTY", origin);

  const format: ImageFormat | null = detectImageFormat(bytes);
  if (!format) return fail("UNSUPPORTED_FORMAT", origin);

  const storageId = await ctx.storage.store(
    new Blob([bytes], { type: IMAGE_CONTENT_TYPES[format] }),
  );
  const result = await ctx.runMutation(internal.uploads.record, {
    storageId,
    format,
    size: bytes.byteLength,
  });
  if (!result.ok) return fail(result.code, origin);
  return json({ uploadId: result.uploadId }, 201, origin);
});

export const uploadPreflight = httpAction(async (_ctx, request) => {
  const origin = allowedOrigin(request);
  return new Response(null, {
    status: origin ? 204 : 403,
    headers: corsHeaders(origin),
  });
});

/** Deletes an upload's file and record (callers decide when that's safe). */
export async function deleteUpload(
  ctx: MutationCtx,
  upload: Doc<"uploads">,
): Promise<void> {
  await ctx.storage.delete(upload.storageId);
  await ctx.db.delete(upload._id);
}

const CLEANUP_BATCH = 100;

/**
 * Daily: deletes pending (never attached) uploads older than 24 hours.
 * Attached and retained photos are never touched; as a second guard, a
 * file still referenced by any listing is skipped.
 */
export const cleanupPendingUploads = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number(), more: v.boolean() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - PENDING_UPLOAD_TTL_MS;
    const expired = await ctx.db
      .query("uploads")
      .withIndex("by_status_and_createdAt", (q) =>
        q.eq("status", "pending").lt("createdAt", cutoff),
      )
      .take(CLEANUP_BATCH);
    let deleted = 0;
    for (const upload of expired) {
      if (upload.listingId && (await referencedBy(ctx, upload))) continue;
      await deleteUpload(ctx, upload);
      deleted += 1;
    }
    const more = expired.length === CLEANUP_BATCH;
    if (more) {
      await ctx.scheduler.runAfter(
        0,
        internal.uploads.cleanupPendingUploads,
        {},
      );
    }
    return { deleted, more };
  },
});

async function referencedBy(
  ctx: MutationCtx,
  upload: Doc<"uploads">,
): Promise<Id<"listings"> | null> {
  if (!upload.listingId) return null;
  const listing = await ctx.db.get(upload.listingId);
  return listing?.imageStorageIds?.includes(upload.storageId)
    ? listing._id
    : null;
}
