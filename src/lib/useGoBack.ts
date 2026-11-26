"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/** Goes back in history when there is somewhere to go, else to `fallback`. */
export function useGoBack(fallback = "/explore") {
  const router = useRouter();
  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }, [router, fallback]);
}
