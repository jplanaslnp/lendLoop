"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@convex/_generated/api";

/**
 * Creates or refreshes the signed-in person's Convex profile once Convex has
 * accepted their Clerk token. The server derives everything from the token;
 * this sends no user data of its own.
 */
export function ProfileSync() {
  const { isAuthenticated } = useConvexAuth();
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const synced = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      synced.current = false;
      return;
    }
    if (synced.current) return;
    synced.current = true;
    ensureCurrent().catch(() => {
      // Retried on the next sign-in or page load; pages that need the
      // profile handle its absence (users.current returns null).
      synced.current = false;
    });
  }, [isAuthenticated, ensureCurrent]);

  return null;
}
