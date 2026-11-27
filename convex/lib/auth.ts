import { ConvexError } from "convex/values";
import type { UserIdentity } from "convex/server";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Identity and role helpers. The caller's identity always comes from the
 * Clerk JWT that Convex verified (`ctx.auth.getUserIdentity()`), never from
 * function arguments. Errors carry a stable `code` for the UI.
 */

export type AuthErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NO_PROFILE";

export function authError(
  code: AuthErrorCode,
  message: string,
): ConvexError<{
  code: AuthErrorCode;
  message: string;
}> {
  return new ConvexError({ code, message });
}

type Ctx = QueryCtx | MutationCtx;

/** The verified Clerk identity, or throws UNAUTHENTICATED. */
export async function requireIdentity(ctx: Ctx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw authError("UNAUTHENTICATED", "Please sign in.");
  return identity;
}

/** Clerk user IDs look like `user_2abc…`; seed IDs (`seed:…`) never do. */
const CLERK_SUBJECT = /^user_[A-Za-z0-9]+$/;

export function isClerkSubject(subject: string): boolean {
  return CLERK_SUBJECT.test(subject);
}

/**
 * The caller's profile, or null when signed out or not provisioned yet.
 * Development seed users are never returned: they are not real accounts.
 */
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || !isClerkSubject(identity.subject)) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  return user && user.seedKey === undefined ? user : null;
}

/** A signed-in, enabled, real member (not a seed user), or null. */
export async function getActiveMember(ctx: Ctx): Promise<Doc<"users"> | null> {
  const user = await getCurrentUser(ctx);
  return user && user.disabledAt === undefined ? user : null;
}

/** An active (not disabled) profile for the caller, or throws. */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  await requireIdentity(ctx);
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw authError("NO_PROFILE", "Your LendLoop profile isn't ready yet.");
  }
  if (user.disabledAt !== undefined) {
    throw authError("FORBIDDEN", "This account is disabled.");
  }
  return user;
}

/** Like requireUser, but only for admins (role stored in Convex only). */
export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw authError("FORBIDDEN", "Admins only.");
  }
  return user;
}
