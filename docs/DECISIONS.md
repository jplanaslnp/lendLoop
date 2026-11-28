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
- [x] (Phase 8: two-step pickup and return; the owner may also confirm a return directly) Confirm pickup/return two-step lifecycle vs simple one-step “mark returned”.
- [x] (Phase 7: half-open `[startDate, endDate)`) Confirm inclusive/exclusive date range semantics.
- [x] (Phase 7: yes; only approved/active loans hold dates) Confirm pending requests may overlap.
- [x] (Phase 8: borrower cancels pending/approved/ready; owner cancels approved/ready; no cancelling after pickup; extensions out of scope) Confirm cancellation and extension policies.
- [ ] Confirm exact owner details shown to borrower and at what status.
- [ ] Confirm notification channel for evaluation (mock, email, Slack or Discord).
- [ ] Confirm whether admins need a dedicated dashboard in the evaluation.

## Pending decisions found in the design audit (to resolve before Phase 2)
Recorded during Phase 1. These describe differences between the design export (`design/`) and the documentation. Nothing here has been decided; the documentation stays authoritative until each item is confirmed.

- [x] (Phase 5) Public Explore card content: the design shows guests the image, description, condition and availability badge (owner details are hidden). The docs allow name and category only (plus ID if needed). Which public fields are approved?
- [x] (Phase 5) Public product detail page: in the design, logged-out visitors can open product details (owner hidden behind "Sign in to see who is sharing this item"). Is a public detail page allowed, and with which fields?
- [x] (Phase 5: the design's 10 categories) Category list: the design uses Home & Kitchen, Garden & Outdoor, Sports & Fitness, Camping & Travel, Electronics, Cleaning, DIY & Tools, Baby & Kids, Books & Games (and Party & Events in Share a Tool). docs/02 suggests Power tools, Garden, Kitchen, Camping, Sports & fitness, Electronics, Cleaning, DIY & tools, Party & events, Baby & kids, Books & games, Other. Which list is final?
- [ ] Extra listing fields in the design (Brand, Model, Includes, up to 4 photos) are not in the requirements. Are any of them in v1 scope?
- [x] (Phase 7: 7 days, global) Maximum loan length: Product Details shows "Max. loan: Up to 7 days". Is there a maximum, and is it global or set per listing?
- [ ] Sign-up address field: the Auth Modal collects "Building, floor, neighbourhood" at sign-up. Should it be collected, when, and how much of it (data minimisation, docs/10)? It is also not a native Clerk sign-up field.
- [ ] Auth modal features: the design includes "Forgot your password?", a Terms/Privacy acceptance checkbox and Google sign-in. Confirm these match the Clerk configuration (Email + Google).
- [x] (Phase 8: design vocabulary kept; owner and borrower may cancel before pickup) Loan status vocabulary: the design uses pending, approved, ready (for pickup), borrowed, overdue, return pending, returned, declined and cancelled, with cancellation by either party after approval. Confirm this matches the lifecycle in docs/06 (this overlaps with the pickup/return and cancellation items above).
- [x] (Phase 8: not in scope; the button stays hidden) Extensions: the Borrowing/Lending designs include an extension icon. Are date extensions in scope (overlaps with the extension policy item above)?
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

## Notes from Phase 6 (listing management)
Approved by the product owner before implementation:
- **Create, edit, delete own listings** (`convex/myListings.ts`). The owner is always the signed-in member from the verified Clerk token. Edit and delete work only on the caller's own **active** listings; another user's, archived, removed or seed listings answer "not found" without revealing they exist.
- **Area field** on the Share form (2–60 characters), stored as `listings.locationLabel` and shown publicly as in Phase 5. The form always shows the hint "Neighbourhood and city only. Never your street, house number, floor or postcode."
- **Delete = archive.** The record is kept (`status: "archived"`, `archivedAt`, `archivedBy`) for future borrowing history and disappears from Explore, product pages and My listings. Archiving is refused while the item is out on loan. Photos of an archived listing are **kept if the listing ever had a borrow request**, otherwise deleted (this also stops create-and-archive loops from growing storage without limit).
- **Photos:** 1–4 per listing, JPEG/PNG/WebP, at most 5 MB each, uploaded to Convex Storage.
- **Brand, Model, Includes and condition note** stay seed-only; the product page shows those rows only when they exist.
- **Limits:** 25 active listings per user; 20 unpublished (pending) photos per user; unpublished photos are deleted after 24 hours.

How uploads are protected (`convex/uploads.ts`, route `POST /photos` in `convex/http.ts`):
- There are no pre-signed upload URLs. The browser sends each file to the HTTP endpoint with its Clerk token, and nothing is stored until the server has checked: an enabled member (seed users excluded), the pending-photo limit, the size (declared and actual bytes, max 5 MB) and the **file signature** (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF…WEBP`). The browser's MIME type and filename are ignored; the file is stored with the detected type, so it is always served as an image.
- The upload is recorded by a transactional mutation that re-checks membership and the pending limit; a parallel upload that loses the last slot has its file deleted in the same request.
- Only the uploader can attach a photo, only while it is unattached (or already on that listing when editing). A photo can't be on two listings.
- Photo lifecycle (`uploads` table): `pending` → `attached` (on a listing) → removed while editing: deleted if the listing never had a borrow request, otherwise `retained`. The daily cron (`convex/crons.ts`) deletes only `pending` uploads older than 24 hours and re-checks that no listing references the file; it never touches `attached` or `retained` photos.
- Allowed browser origins come from the Convex variable `APP_ORIGINS` (dev: `http://localhost:3000,http://localhost:3100`). It is not set on production yet; set it to the production site when deploying. Authentication is the bearer token, not cookies, so the origin list is defence in depth.

Known limitations (Phase 6):
- **Area validation is best-effort, not a privacy guarantee.** Convex rejects common address patterns: runs of 3+ digits (postcodes, house numbers), UK/Dutch postcode shapes, decimal numbers and degrees (coordinates), floor/apartment/door/building words, and a street word next to a number ("Veldstraat 12"). Short numbers that are part of a name ("District 9", "Paris 15e") are allowed. An address without street words or long numbers (e.g. "Main 5") cannot be told apart from an area name and passes; the visible hint is the main safeguard. The keyword list in `convex/lib/listingRules.ts` is easy to extend.
- The signature check proves a file starts like a JPEG/PNG/WebP; it does not decode the whole image. Combined with storing the detected type, a disguised file cannot be served as anything but an image, but a corrupt image may still show as broken.
- Photos are not resized or compressed; large phone photos (up to 5 MB) are served as uploaded.
- Other users' profile pages (`/users/[id]`) and the Borrowing/Lending pages still use mock data.

## Notes from Phase 7 (borrow requests and availability)
Approved by the product owner before implementation:
- **Request flow** (`convex/borrowRequests.ts`): a signed-in member picks dates on the product page and sends a request, which creates a `pending` record. The borrower comes from the verified Clerk token and the owner is copied from the listing; neither is ever an argument. Owners can't request their own listing ("This is your listing" + Edit listing replaces the button). Archived, removed, unknown listings and listings of disabled owners answer "not found".
- **Demo listings are not requestable.** Listings with a `seedKey`, or whose owner is a seed user, are refused (`UNAVAILABLE`): their fictional owners can't sign in to answer. The product page shows "Demo item · requests are turned off". Seed data exists only in development.
- **Date model:** half-open `[startDate, endDate)` of calendar days stored as `YYYY-MM-DD`; `endDate` is the day after the last day of use. No timestamps represent local midnight. Loans last 1–7 days and start between today and today + 90 days.
- **Availability:** only `approved`, `ready_for_pickup`, `borrowed`, `overdue` and `return_pending` hold dates. Pending requests don't, so several neighbours may ask for the same dates; the owner chooses in Phase 8. A borrower can't have two open requests overlapping on the same listing (`DUPLICATE`). The public `availability` query returns booked dates only (no borrower, status or IDs).
- **Limits:** at most 20 open (pending) requests per borrower; optional plain-text message up to 200 characters, visible only to the borrower and that listing's owner (the owner's view arrives in Phase 8).
- **Cancel:** the borrower may cancel their own `pending` request only. Archiving a listing cancels its pending requests in the same transaction (`cancelledBy` = owner, `cancelReason: "listing_archived"`); the borrower sees "Listing removed".
- **No notifications yet** (Phase 10). The product page says "Request sent · waiting for the owner.", and Borrowing copy no longer promises notifications.
- **Lending stays mock** until Phase 8. Borrowing (`/borrowing`) reads `borrowRequests.mine` and offers only "See Product Details" and "Cancel Request"; the owner is shown as in Explore ("Marc S." and the area), never a building or address.

Time-zone policy:
- "Today" is the borrower's **local calendar date**. The browser sends its IANA time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) as the borrower's **declared** calendar zone. Convex accepts only IANA-shaped names (no `+02:00` offsets) that its `Intl` runtime knows, stores the canonical name (`Asia/Kolkata` → `Asia/Calcutta`) on the request (`timeZone`), and computes today from **its own clock** in that zone. All date and duration checks run on the server (`convex/lib/requestRules.ts`).
- The time zone is **not** a verified location or identity, and it grants nothing else. A user can technically declare a different valid zone. Every real zone is within UTC−12…UTC+14, so this shifts "today" by at most about a day either way and never allows a date that has already ended everywhere; the 90-day and 7-day limits are counted from that same server-computed date.
- Daylight-saving changes can't shift ranges: day arithmetic uses UTC day numbers, and the only instant-to-date conversion is "today in this zone" through `Intl`. Verified on the Convex dev runtime before implementation (DST in Brussels and New York, UTC+14/−12, +5:45, Lord Howe).

Concurrency and Phase 8:
- `create` reads every request of the listing (`by_listing`) and inserts in the same mutation. Convex mutations are serializable: if another request on that listing commits first, the mutation is retried and re-checks. `findBlockingConflict(ctx, listingId, start, end, excludeId)` is the same check for Phase 8's approval, which must call it inside the approving mutation.
- Each send carries a client `idempotencyKey` (one per opened dialog); a retry with the same key returns the existing request instead of creating another.
- [ ] Phase 8: archiving is refused only while an item is borrowed/overdue/return-pending. It should also be refused (or defined) for `approved` and `ready_for_pickup`, which can't exist before Phase 8.

E2E tests:
- `tests/e2e/borrowing.spec.ts` uses two Clerk development test users: `E2E_CLERK_USER_*` (borrower) and `E2E_CLERK_OWNER_*` (owner, created manually in the Clerk dashboard). Credentials come from the local environment only; the test skips when any is missing. It never touches the demo listings and archives the listing it creates.

Known limitations (Phase 7):
- `convex-test` runs mutations one after another, so the parallel-request tests check outcomes, not Convex's internal retry; the retry itself is Convex's transaction guarantee.
- `borrowRequests.mine` returns the latest 100 requests (no pagination yet).
- E2E runs leave archived test listings and cancelled test requests in the dev deployment.

Open issue (Phase 7): signed-in member briefly treated as signed out after a page load
- **Symptom:** `tests/e2e/borrowing.spec.ts` fails (desktop and mobile) at the second "Send request" (line ~254): the "Confirm your request" dialog never opens because the LendLoop sign-in modal ("Welcome back") opens instead.
- **Root cause (observed with an instrumented run):** after a full page load, a member whose short-lived Clerk session token has expired gets a server render that reports Clerk as loaded and **signed out** (`useAuth().isLoaded === true`, `isSignedIn === false`) while Clerk's browser script is still loading. About 500 ms later the script refreshes the token and reports the member as signed in, but a click on "Request to borrow" in that window was already treated as a guest's: `requireAuth` opened the sign-in modal, which then stays open. Real users who return to a page after the token expired and click quickly hit the same thing. Captured state: before the click `clerkLoaded: false`, header signed out; right after the click the "Welcome back" dialog; 500 ms later `clerkLoaded: true`, signed in as the borrower, modal still open. No console errors.
- **Affected files:** `src/features/auth/AuthProvider.tsx` (`requireAuth`, `guardLink`); surfaced by `src/features/tools/ProductDetailsScreen.tsx` (Request to borrow).
- **Reproduce:** sign in as a member; stay idle until the session token expires (about a minute); do a full page load of another member's `/tools/<id>`; pick dates and click "Request to borrow" within the first half-second. The sign-in modal opens instead of "Confirm your request". The e2e test reproduces it reliably because it navigates and clicks immediately after a long flow.
- **Fix applied (approved option B), limited to `requireAuth` and `guardLink`:** both now treat Clerk as ready only when its browser script has loaded and confirmed the session (`useClerk().loaded`, observed through `clerk.addListener`), not from the server render. A `requireAuth` click before that is held and resolved once Clerk confirms: members get the action, genuine guests get the sign-in modal. `guardLink` lets links through until then (proxy.ts still gates account pages). Sign-in, sign-out, the sign-in gate and protected-page redirects are unchanged.
- **Status (updated in Phase 8):** covered by `tests/unit/require-auth.test.tsx` (7 tests; 4 fail against the original Phase 3 code, all pass with the fix). **Confirmed end to end:** in Phase 8 the complete Playwright suite passed (30/30, desktop and mobile), including `tests/e2e/borrowing.spec.ts`. This is one full run; keep watching it for flakiness.

## Notes from Phase 8 (incoming requests and loan lifecycle)
Approved by the product owner before implementation:
- **Lifecycle and actors** (enforced in Convex; every other transition, and any repeat, is refused):

  | From | To | Actor |
  |---|---|---|
  | pending | approved | owner (availability re-checked in the same transaction) |
  | pending | declined | owner |
  | pending | cancelled | borrower |
  | approved | ready_for_pickup | owner ("Item ready for pickup") |
  | approved, ready_for_pickup | cancelled | borrower or owner |
  | ready_for_pickup | borrowed | borrower ("Confirm Pickup") |
  | borrowed | overdue | system (hourly cron) |
  | borrowed, overdue | return_pending | borrower ("Mark as Returned") |
  | borrowed, overdue, return_pending | returned | owner ("Confirm Return") |

  No cancelling after pickup: the item follows the return flow. Extensions are not in scope.
- **Approval** re-checks availability inside the approving mutation and, in the same transaction, declines the other pending requests on that listing whose dates overlap (`declineReason: "dates_taken"`, actor `system`). Approval records `approvedAt`/`approvedBy`.
- **Pickup note:** the owner may add an optional plain-text note (max 200 characters) when approving. Only the borrower sees it, and only once the request is approved. No exact address is stored or shown anywhere.
- **Overdue:** a loan is overdue from the beginning of its `endDate` (the day after the last day of use) in the borrower's stored time zone. `dueAt` (that local midnight as a UTC instant) is computed server-side when pickup is confirmed. An hourly cron moves `borrowed` loans with `dueAt` ≤ now to `overdue`; it is idempotent (the status is re-checked in the same transaction, so a second run writes nothing).
- **Admins** act only as ordinary members in Phase 8. Viewing or managing other people's loans is Phase 9.
- **Archiving** a listing is refused while it has a loan that is `approved`, `ready_for_pickup`, `borrowed`, `overdue` or `return_pending`; pending requests are still cancelled automatically (Phase 7).
- **Status history:** every transition appends a `requestEvents` row (previous status, new status, actor role and user, server timestamp, optional reason). Only server code inserts rows; no function updates or deletes them.
- **Existing development data:** requests created before Phase 8 get history through an idempotent internal backfill that only records events the stored data establishes (creation by the borrower at `createdAt`; a cancellation with its stored `cancelledAt`, `cancelledBy` and reason). Statuses and timestamps are not changed, nothing is deleted, and backfilled rows are marked `backfilled: true`.

Implementation notes (Phase 8):
- `convex/loans.ts`: `approve`, `decline`, `markReady`, `confirmPickup`, `markReturned`, `confirmReturn` (each takes only the request ID; `approve` also the optional pickup note), the `incoming` query (Lending), the internal `markOverdueLoans` (hourly cron) and the internal `backfillHistory`. `borrowRequests.cancel` handles both parties' cancellations. Transition rules live in `convex/lib/lifecycle.ts`; every write goes through `applyTransition` (`convex/lib/history.ts`), which patches the request and appends the event in one transaction.
- Approval is refused when the requested dates have already passed (`DATES_PASSED`: `endDate` ≤ the borrower's today), so stale requests can't become loans.
- The borrower sees the owner as "Marc S." and the owner sees the borrower as "Bruno M." (same members-only view as Explore). No email, user ID or address is returned.
- The UI offers only the actions valid for the status and the person (Borrowing: Details, Cancel, Pickup details, Confirm Pickup, Mark as Returned; Lending: Approve with optional note, Decline, Item ready for pickup, Cancel Loan, Confirm Return). "Request Extension" is never offered. Toasts and banners no longer promise notifications or reminders (Phases 10–11).
- My Profile's lending and borrowing history sections show real data; only other members' profile pages (`/users/[id]`) still use Phase 2 mock data.
- Schema changes are additive and optional: `requestEvents` (new), and `borrowRequests.approvedBy`, `declinedBy`, `pickupNote`. Existing documents stay valid; no migration of stored fields. The dev deployment's 13 earlier requests were backfilled (26 events, statuses and timestamps unchanged; a second run added nothing).

Known limitations (Phase 8):
- Overdue is applied by an hourly cron, so a loan can show "On loan" for up to an hour after it became due.
- A loan that was approved but never picked up is not expired automatically; either party can cancel it.
- `convex-test` runs mutations one after another: the concurrent-approval test checks the outcome; the retry itself is Convex's transaction guarantee.
- `incoming` and `mine` return the latest 100 requests (no pagination yet).
- E2E runs leave archived test listings and finished test loans in the dev deployment.

