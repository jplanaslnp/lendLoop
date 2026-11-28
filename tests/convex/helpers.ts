import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { TestConvex } from "convex-test";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type schema from "@convex/schema";

export const modules = import.meta.glob("../../convex/**/*.ts");

export const ORIGIN = "http://localhost:3000";

const FIXTURES = join(__dirname, "..", "fixtures", "images");
export const fixture = (name: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array(readFileSync(join(FIXTURES, name)));

export function identity(name: string) {
  return {
    subject: `user_${name}`,
    issuer: "https://example.clerk.accounts.dev",
    name: `${name[0]!.toUpperCase()}${name.slice(1)} Tester`,
  };
}

type T = TestConvex<typeof schema>;
export type Member = ReturnType<T["withIdentity"]>;

/** Signs in as a Clerk-shaped user and provisions their Convex profile. */
export async function member(t: T, name: string): Promise<Member> {
  const asUser = t.withIdentity(identity(name));
  await asUser.mutation(api.users.ensureCurrent, {});
  return asUser;
}

/** POSTs bytes to /photos like the browser does. */
export function postPhoto(
  as: Member | T,
  bytes: Uint8Array<ArrayBuffer>,
  headers: Record<string, string> = {},
) {
  return as.fetch("/photos", {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      "Content-Type": "image/jpeg",
      "Content-Length": String(bytes.byteLength),
      ...headers,
    },
    body: bytes,
  });
}

export async function uploadPhoto(
  as: Member,
  name = "pixel.jpg",
): Promise<Id<"uploads">> {
  const response = await postPhoto(as, fixture(name));
  const body = (await response.json()) as { uploadId?: Id<"uploads"> };
  if (response.status !== 201 || !body.uploadId) {
    throw new Error(
      `upload failed: ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return body.uploadId;
}

export const validListing = (photoIds: Id<"uploads">[]) => ({
  name: "Cordless Drill",
  category: "diy" as const,
  condition: "good" as const,
  description: "Battery drill with two bits, works great.",
  area: "Patershol, Gent",
  photoIds,
});
