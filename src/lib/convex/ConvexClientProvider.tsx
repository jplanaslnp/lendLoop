"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

/**
 * Convex client for the browser, authenticated with the Clerk session.
 * ConvexProviderWithClerk fetches a Clerk token for the "convex" audience
 * and keeps Convex's auth state in step with sign-in and sign-out.
 *
 * NEXT_PUBLIC_CONVEX_URL is the deployment URL written by `npx convex dev`
 * (https://<deployment>[.<region>].convex.cloud) — public, not a secret.
 */
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` to link the deployment.",
  );
}
// Optional region segment, e.g. https://<name>.ap-southeast-2.convex.cloud
if (
  !/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)?\.convex\.cloud\/?$/.test(convexUrl)
) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL must be the Convex deployment URL (https://<deployment>[.<region>].convex.cloud).",
  );
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
