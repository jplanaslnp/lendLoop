"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useMockSession } from "./MockSessionProvider";

/**
 * Phase 2 UI gate for account pages (Borrowing, Lending, Share, profiles):
 * signed-out visitors get the sign-in modal and no page content, matching the
 * design's AUTH_GATE behaviour. Closing the modal returns to Explore.
 *
 * This is presentation only — real protection is enforced by Clerk/Convex in
 * Phases 3–4.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isSignedIn, openAuth } = useMockSession();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (!isSignedIn) openAuth({ gate: true });
  }, [isSignedIn, openAuth]);

  return isSignedIn ? <>{children}</> : null;
}
