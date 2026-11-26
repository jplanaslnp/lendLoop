import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { signInGateUrl } from "@/features/auth/returnTo";

/**
 * Account pages that require a signed-in Clerk session. Explore and product
 * pages stay public. This only gates page access: every private read/write
 * is authorised again inside Convex (Phase 4+), never trusted from here.
 */
const PROTECTED_PREFIXES = [
  "/borrowing",
  "/lending",
  "/share",
  "/profile",
  "/users",
] as const;

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname, search } = request.nextUrl;
  if (!isProtected(pathname)) return;

  const { isAuthenticated } = await auth();
  if (isAuthenticated) return;

  // Signed out: open the LendLoop sign-in modal on Explore (not Clerk's
  // hosted page), then continue to the page that was asked for.
  const target = new URL(signInGateUrl(`${pathname}${search}`), request.url);
  return NextResponse.redirect(target);
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
