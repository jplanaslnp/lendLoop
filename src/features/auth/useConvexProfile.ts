"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";

/**
 * The signed-in person's LendLoop profile from Convex: `undefined` while
 * loading, `null` when signed out or not created yet (see ProfileSync).
 */
export function useConvexProfile() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.users.current, isAuthenticated ? {} : "skip");
}
