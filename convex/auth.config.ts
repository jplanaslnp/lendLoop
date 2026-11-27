import type { AuthConfig } from "convex/server";

/**
 * Convex accepts Clerk session JWTs from this issuer only.
 *
 * CLERK_JWT_ISSUER_DOMAIN is a Convex *deployment* environment variable (set
 * with `npx convex env set` or in the Convex dashboard), not a Next.js one:
 * the Clerk Frontend API URL, e.g. https://<name>.clerk.accounts.dev.
 * `applicationID: "convex"` must match the token's `aud` claim, which Clerk
 * sets when its Convex integration is activated.
 */
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!domain) {
  throw new Error(
    "Missing CLERK_JWT_ISSUER_DOMAIN in the Convex deployment environment.",
  );
}

export default {
  providers: [{ domain, applicationID: "convex" }],
} satisfies AuthConfig;
