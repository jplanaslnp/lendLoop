"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. Only for content that cannot be expressed
 * with responsive CSS (e.g. placeholder text). Layout must use Tailwind
 * breakpoints. Server render and hydration use `serverValue`, so there is no
 * hydration mismatch; the client value applies right after hydration.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Matches the design's mobile layout (< 760px). */
export const MOBILE_QUERY = "(max-width: 759.98px)";
