import type { UserIdentity } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { authError, getCurrentUser, requireIdentity } from "./lib/auth";
import { roleValidator } from "./schema";

/**
 * Current-user profile. The only identity input is the verified Clerk JWT;
 * neither function accepts a user ID, role or email from the client.
 */

const NAME_MAX = 120;
const EMAIL_MAX = 254;

/** What the signed-in person may see about themselves. */
const currentUserDto = v.object({
  id: v.id("users"),
  name: v.string(),
  email: v.union(v.string(), v.null()),
  role: roleValidator,
  isTrustedLender: v.boolean(),
  createdAt: v.number(),
});

/** Name/email from the token, trimmed and length-limited. */
export function profileFromIdentity(identity: UserIdentity): {
  name: string;
  email: string | undefined;
} {
  const fromParts = [identity.givenName, identity.familyName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
  const name = (identity.name?.trim() || fromParts || "Neighbour").slice(
    0,
    NAME_MAX,
  );
  // Only keep an email Clerk has verified.
  const email =
    identity.email && identity.emailVerified !== false
      ? identity.email.trim().toLowerCase().slice(0, EMAIL_MAX)
      : undefined;
  return { name, email };
}

/** The caller's own profile, or null when signed out / not yet created. */
export const current = query({
  args: {},
  returns: v.union(currentUserDto, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.disabledAt !== undefined) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email ?? null,
      role: user.role,
      isTrustedLender: user.isTrustedLender,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Creates the caller's profile on first use, or refreshes name/email from
 * the token. Role and trusted status are set to safe defaults on creation
 * and never changed here. Idempotent: repeated calls make no extra rows.
 */
export const ensureCurrent = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const { name, email } = profileFromIdentity(identity);
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      if (existing.disabledAt !== undefined) {
        throw authError("FORBIDDEN", "This account is disabled.");
      }
      if (existing.name !== name || existing.email !== email) {
        await ctx.db.patch(existing._id, { name, email, updatedAt: now });
      }
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
      role: "user",
      isTrustedLender: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
