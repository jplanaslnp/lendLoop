"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useAuthUi } from "./AuthProvider";

/**
 * Client-side companion to the proxy.ts gate for account pages (Borrowing,
 * Lending, Share, profiles). The proxy already redirects signed-out requests;
 * this covers a session that ends while the page is open (e.g. sign-out in
 * another tab): content is hidden and the sign-in modal opens, and closing
 * it returns to Explore — the design's AUTH_GATE behaviour.
 *
 * Presentation only: private data is authorised server-side (Convex, Phase 4+).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, isSigningOut, openAuth } = useAuthUi();
  const opened = useRef(false);
  const signedOut = isLoaded && !isSignedIn && !isSigningOut;

  useEffect(() => {
    if (!signedOut) {
      opened.current = false;
      return;
    }
    if (opened.current) return;
    opened.current = true;
    openAuth({
      gate: true,
      intent: {
        kind: "navigate",
        href: `${window.location.pathname}${window.location.search}`,
      },
    });
  }, [signedOut, openAuth]);

  // While Clerk loads, trust the proxy check that let this request through.
  return signedOut ? null : <>{children}</>;
}
