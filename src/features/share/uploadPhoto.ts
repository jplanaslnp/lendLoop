import type { Id } from "@convex/_generated/dataModel";

/**
 * Sends one photo to the Convex `/photos` endpoint (convex/uploads.ts) with
 * the caller's Clerk session token. All checks (owner, size, real format,
 * pending limit) happen on the server; this only reports the outcome.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
  process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/\.cloud\/?$/, ".site");

export class PhotoUploadError extends Error {}

export async function uploadPhoto(
  file: File,
  getToken: () => Promise<string | null>,
): Promise<Id<"uploads">> {
  if (!SITE_URL) throw new PhotoUploadError("Uploads aren’t configured.");
  const token = await getToken();
  if (!token) throw new PhotoUploadError("Please sign in to upload photos.");
  let response: Response;
  try {
    response = await fetch(`${SITE_URL}/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: file,
    });
  } catch {
    throw new PhotoUploadError(
      "Couldn’t upload a photo. Check your connection and try again.",
    );
  }
  const body = (await response.json().catch(() => null)) as {
    uploadId?: Id<"uploads">;
    error?: { message?: string };
  } | null;
  if (!response.ok || !body?.uploadId) {
    throw new PhotoUploadError(
      body?.error?.message ?? "Couldn’t upload a photo. Please try again.",
    );
  }
  return body.uploadId;
}
