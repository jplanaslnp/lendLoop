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
- Public logged-out list returns tool name and category only.
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

- [ ] Public Explore card content: the design shows guests the image, description, condition and availability badge (owner details are hidden). The docs allow name and category only (plus ID if needed). Which public fields are approved?
- [ ] Public product detail page: in the design, logged-out visitors can open product details (owner hidden behind "Sign in to see who is sharing this item"). Is a public detail page allowed, and with which fields?
- [ ] Category list: the design uses Home & Kitchen, Garden & Outdoor, Sports & Fitness, Camping & Travel, Electronics, Cleaning, DIY & Tools, Baby & Kids, Books & Games (and Party & Events in Share a Tool). docs/02 suggests Power tools, Garden, Kitchen, Camping, Sports & fitness, Electronics, Cleaning, DIY & tools, Party & events, Baby & kids, Books & games, Other. Which list is final?
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
