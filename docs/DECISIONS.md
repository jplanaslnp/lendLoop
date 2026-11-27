# Decision Log

Record decisions that affect product behavior, schema, security or architecture.

## Confirmed baseline
- Product name: LendLoop.
- Tagline: “Borrow what you need. Lend what you don’t.”
- Responsive web app, not native mobile.
- Next.js 16 stable / App Router / React / TypeScript.
- Clerk authentication.
- Convex database and backend.
- n8n automation.
- Roles: `user` and `admin`.
- Standard user can lend and borrow.
- Trusted Lender is an admin-controlled flag, not a role.
- Public (logged-out) listing data: everything about the item, nothing about the owner (approved in Phase 5, replaces “tool name and category only”; see Phase 5 notes).
- Convex enforces authorization; UI is not a security boundary.

## Pending decisions
- [ ] Confirm if Share your tool design brand is replaced fully by LendLoop (recommended: yes).
- [ ] Confirm image upload is required in v1.
- [ ] Confirm pickup/return two-step lifecycle vs simple one-step “mark returned”.
- [ ] Confirm inclusive/exclusive date range semantics.
- [ ] Confirm pending requests may overlap.
- [ ] Confirm cancellation and extension policies.
- [ ] Confirm exact owner details shown to borrower and at what status.
- [ ] Confirm notification channel for evaluation (mock, email, Slack or Discord).
- [ ] Confirm whether admins need a dedicated dashboard in the evaluation.

## Pending decisions found in the design audit (to resolve before Phase 2)
Recorded during Phase 1. These describe differences between the design export (`design/`) and the documentation. Nothing here has been decided; the documentation stays authoritative until each item is confirmed.

- [x] (Phase 5) Public Explore card content: the design shows guests the image, description, condition and availability badge (owner details are hidden). The docs allow name and category only (plus ID if needed). Which public fields are approved?
- [x] (Phase 5) Public product detail page: in the design, logged-out visitors can open product details (owner hidden behind "Sign in to see who is sharing this item"). Is a public detail page allowed, and with which fields?
- [x] (Phase 5: the design's 10 categories) Category list: the design uses Home & Kitchen, Garden & Outdoor, Sports & Fitness, Camping & Travel, Electronics, Cleaning, DIY & Tools, Baby & Kids, Books & Games (and Party & Events in Share a Tool). docs/02 suggests Power tools, Garden, Kitchen, Camping, Sports & fitness, Electronics, Cleaning, DIY & tools, Party & events, Baby & kids, Books & games, Other. Which list is final?
- [ ] Extra listing fields in the design (Brand, Model, Includes, up to 4 photos) are not in the requirements. Are any of them in v1 scope?
- [ ] Maximum loan length: Product Details shows "Max. loan: Up to 7 days". Is there a maximum, and is it global or set per listing?
- [ ] Sign-up address field: the Auth Modal collects "Building, floor, neighbourhood" at sign-up. Should it be collected, when, and how much of it (data minimisation, docs/10)? It is also not a native Clerk sign-up field.
- [ ] Auth modal features: the design includes "Forgot your password?", a Terms/Privacy acceptance checkbox and Google sign-in. Confirm these match the Clerk configuration (Email + Google).
- [ ] Loan status vocabulary: the design uses pending, approved, ready (for pickup), borrowed, overdue, return pending, returned, declined and cancelled, with cancellation by either party after approval. Confirm this matches the lifecycle in docs/06 (this overlaps with the pickup/return and cancellation items above).
- [ ] Extensions: the Borrowing/Lending designs include an extension icon. Are date extensions in scope (overlaps with the extension policy item above)?
- [ ] Footer links (How it works, FAQs, Community guidelines, Contact us, Terms of Service, Privacy Policy): do these pages exist in v1, or should the links be placeholders?
- [ ] Concept PNGs in `design/uploads/` use older navigation (My Requests / My Loans / About). Confirm the `.dc.html` screens (Explore / Borrowing / Lending) supersede them.

## Technical decisions recorded in Phase 1
- Node.js 24 LTS is the supported runtime (`.nvmrc`, `engines`). Vitest 5 does not support Node 25.
- pnpm 10.32.1 is the only package manager (`packageManager` field).
- TypeScript 5.9.3: `typescript-eslint` (used by `eslint-config-next`) supports TypeScript `<6.1`, and `create-next-app@16.4.6` installs TypeScript 5. TypeScript 7 is not used.
- ESLint 9.39.5: every plugin bundled in `eslint-config-next@16.4.6` declares ESLint 9 support, but not all of them declare ESLint 10 yet. The ESLint 9 line is no longer supported upstream, so revisit the move to ESLint 10 once the plugin peer ranges include it.
- Vitest (not Jest) for unit and component tests. Playwright for end-to-end tests.
- `@/*` resolves to `./src/*`. `app/` stays at the repository root (docs/09).
- `cacheComponents` and `partialPrefetching` stay enabled, as in the Next.js 16.4 defaults. Revalidate this against the Clerk and Convex integration in Phases 3–4.
- `agentRules: false` in `next.config.ts`, so `CLAUDE.md` remains the single source of agent instructions (no generated `AGENTS.md`).

## Notes from Phase 2 (UI integration with mock data)
Phase 2 reproduces the approved design as-is. None of the pending decisions above were resolved by it; these items still need a decision:
- [x] (Phase 5: approved as is) Public Explore cards currently show what the design shows signed-out visitors (photo, description, category, condition and availability; no owner details). This must be narrowed to the approved public fields when the Convex public query is built (Phase 5).
- [ ] The design's mock signed-in user is "Jaume Planas" with a real-looking photo (`public/images/avatars/jaume.jpg`). Confirm this may stay as demo content, or replace it with a neutral placeholder before any public deployment.
- [ ] Listings without photos use a neutral photo placeholder; the design used an editor-only "Drop photo" slot. Depends on the photo decision above.
- [ ] The DJI Osmo Mobile product page (the design's detailed example) is reachable from its owner's profile but is not in the design's Explore list. Confirm whether every listing should expose Brand/Model/Includes.
- [ ] Sign-in is simulated in memory for Phase 2 only (no persistence, no credentials stored). Phase 3 replaces it with Clerk and must decide how the custom modal maps to Clerk flows.

## Notes from Phase 3 (Clerk authentication)
Decisions taken while wiring the approved modal to Clerk (`@clerk/nextjs` 7, custom-flow API). Items marked [ ] still need a product decision.
- Sign-in UI is the LendLoop modal; Clerk's prebuilt pages are not used. Clerk's own redirects (`signInUrl`) and the proxy gate both open the modal on `/explore?auth=sign-in&redirect_url=…`. Return paths are accepted only as same-site relative paths (open-redirect protection).
- Account pages (`/borrowing`, `/lending`, `/share`, `/profile`, `/users/*`) are gated in `proxy.ts`. This is page access only; private data must still be authorised in Convex (Phase 4+). Explore and product pages stay public.
- The modal gained steps the static design did not show, built from its existing fields and styles: "Check your email" (email code for sign-up verification and Clerk's new-device check) and "Reset your password" (code + new password). Clerk's bot-protection challenge appears in Clerk's own small dialog when Clerk asks for it.
- An intended action that leaves the page (Google sign-in) is carried in the URL (e.g. `/tools/<id>?intent=request&from=…&to=…`) and re-validated on return; nothing is kept in localStorage.
- My Profile shows the Clerk name, email, image and join month. "Edit profile" saves the name to Clerk; the building field remains local mock data until the Convex profile exists.
- [ ] Clerk's password minimum on the development instance is 15 characters, while the design's copy and client check say "8+ characters". Either lower the Clerk setting to 8 or change the copy; until then Clerk's message is shown under the field.
- [ ] The sign-up address is validated as designed but not sent to Clerk or stored anywhere (not appropriate for Clerk metadata). Decide in Phase 4 whether it moves to the Convex profile or to a post-sign-up step.
- [ ] The Terms/Privacy checkbox is required by the form, but Clerk's legal-consent setting is off, so acceptance is not recorded. Enable it in Clerk (and pass `legalAccepted`) or record consent in Convex.

## Notes from Phase 4 (Convex backend and identity bridge)
- Convex dev deployment `gallant-opossum-232` (project `lendloop`, region ap-southeast-2) is linked through `npx convex dev`. `convex/_generated/` is committed, as Convex recommends.
- Identity: Clerk's Convex integration (native, not a JWT template) issues session tokens with `aud: "convex"`; `convex/auth.config.ts` accepts only the Clerk issuer in the deployment variable `CLERK_JWT_ISSUER_DOMAIN`. Functions identify callers with `ctx.auth.getUserIdentity().subject` (stored as `users.clerkId`) and accept no user IDs, roles or emails from clients.
- Profiles are created/refreshed by `users.ensureCurrent` after sign-in (`ProfileSync`). New profiles are always `role: "user"`, `isTrustedLender: false`; admin assignment stays a manual operator step (dashboard) until an audited admin function exists.
- Every table and index from docs/05 exists; only `users` is written in Phase 4. `borrowRequests.endDate` semantics (inclusive vs. half-open) remain the open decision recorded under docs/06.
- [x] (Done: `name` claim added) Clerk's default session token has no name or email claims, so profiles fall back to the name "Neighbour". Add a `name` claim in Clerk (Sessions → Customize session token). Whether to add `email` too depends on the notification design (Phase 10); it is left out for data minimisation.
- [ ] The sign-up address field (Phase 3 note) is still not stored; the `users` table has no address field until that decision is made.

## Notes from Phase 5 (public Explore and product details on Convex)
Approved by the product owner before implementation:
- **Public item data.** Everyone, signed in or not, may see an item's photos, name, category, description, condition, availability, approximate location (e.g. "Patershol, Gent") and the static minimap image. This replaces the earlier "name and category only" rule.
- **Owner identity is members-only.** Logged-out visitors never receive the owner's name, avatar, profile link, Clerk ID, internal user ID or any other owner data. `convex/listings.ts` builds owner data only for a signed-in, enabled member with a Convex profile; for everyone else the `owner` key is absent from the response (enforced by return validators and tested in `tests/convex/listings.test.ts`).
- **Member view of the owner:** first name and last-name initial (e.g. "Marc S.") and avatar, linking to the profile page. Building, address, floor, door and precise location are not shown to anyone; the card's former building slot shows the area name.
- **Location privacy.** `listings.locationLabel` holds an approximate area only. The minimap stays the static image with an approximate-area circle; no map API or geolocation. The exact pickup location is decided with the approval workflow (Phase 7+).
- **Categories:** exactly the 10 from the design (`home`, `garden`, `sports`, `camping`, `electronics`, `cleaning`, `party`, `diy`, `kids`, `books`). The Explore filter row omits Party & Events, as in the design.
- **Product page** (`/tools/[id]`) reads the same Convex listing as Explore; unknown or malformed IDs get the not-found page (in production the status is 200 with `noindex`, because the page shell is streamed before the lookup finishes; dev answers 404). The calendar and "Request to borrow" stay mock UI until Phase 7.
- **Availability** is derived from loans: an item is "Borrowed" while a request for it is `borrowed`, `overdue` or `return_pending`. No loans exist before Phase 7, so every seeded item currently shows "Available" (the design marked three as borrowed).

Development seed data:
- `convex/seed.ts` (`seed:run`, `seed:clear`) loads the 13 tools in the design (12 on Explore plus the DJI Osmo Mobile), owned by 8 fictional neighbours. They are internal functions (not callable from the browser) and refuse to run unless the deployment sets `LENDLOOP_DEV_SEED=enabled`, which must never be set in production. Re-running updates rows in place (idempotent, keyed by `seedKey`).
- Seed users have `clerkId: "seed:<key>"` and a `seedKey`. Only Clerk-shaped subjects (`user_…`) are accepted as identities, and rows with a `seedKey` are never returned as the current user, so seed users cannot sign in or act as members.
- For the design's demo links, `listings.get` also accepts a seed key (e.g. `/tools/projector`), and a seed owner's profile link uses the seed key so the existing mock profile pages keep working. Profiles of real users are not built yet; their link uses the Convex user ID.

Technical notes:
- `listings` gained `locationLabel` (required), optional `photos` (bundled `/images/...` paths, used by seed data; uploads stay a Phase 6 decision via `imageStorageIds`), `longDescription`, `conditionNote`, `details` (Brand/Model/Includes rows) and `seedKey`. `users` gained optional `imageUrl` and `seedKey`.
- The UI condition id `likeNew` became `like_new` to match Convex.
- Explore requests at most 100 listings; pagination comes when real data needs it.
- [ ] Whether listing owners can set `details` and `conditionNote` is part of the Phase 6 form decision (the design's Brand/Model/Includes fields).
- [ ] Borrowing, Lending and user profile pages still use mock data (Phases 7–8 and later).

Known limitations (Phase 5):
- **Unknown tool IDs answer HTTP 200 in production, not 404.** `/tools/[id]` uses Partial Prerendering (`cacheComponents`): the page shell starts streaming before the Convex lookup finds that the listing does not exist, and a status code cannot change once sent. Visitors still get the "Page not found" page, and Next.js adds `<meta name="robots" content="noindex">` so search engines do not index it. The dev server answers 404. A true 404 would need this route rendered without streaming (or the lookup moved ahead of the shell); revisit if SEO or monitoring needs real 404s.
- Seed users live in the same `users` table as real accounts, marked by `seedKey` and a `seed:` clerkId. Future admin screens or user counts must exclude rows with a `seedKey`.
- `listings.list` returns at most 100 listings (no pagination yet).

