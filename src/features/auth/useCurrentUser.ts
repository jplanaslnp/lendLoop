"use client";

import { useUser } from "@clerk/nextjs";

import { MONTH_SHORT } from "@/lib/dates";

/**
 * The signed-in person as shown in LendLoop's own UI (header avatar, My
 * Profile, the Share preview). Read from Clerk in the browser and shown only
 * to that person; nothing here is sent to other users or public pages.
 *
 * Building/address are not stored anywhere yet; they come from the Convex
 * profile in Phase 4.
 */
export type CurrentUser = {
  fullName: string;
  /** "Jaume P." style name used on listing cards. */
  shortName: string;
  email: string | null;
  imageUrl: string | null;
  /** e.g. "Mar 2025". */
  memberSince: string | null;
};

export function useCurrentUser(): CurrentUser | null {
  const { isLoaded, user } = useUser();
  if (!isLoaded || !user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  const fallback = email ? (email.split("@")[0] ?? email) : "Neighbour";
  const fullName = [first, last].filter(Boolean).join(" ") || fallback;
  const shortName = first
    ? last
      ? `${first} ${last.charAt(0)}.`
      : first
    : fallback;
  const created = user.createdAt;

  return {
    fullName,
    shortName,
    email,
    imageUrl: user.imageUrl || null,
    memberSince: created
      ? `${MONTH_SHORT[created.getMonth()] ?? ""} ${created.getFullYear()}`
      : null,
  };
}
