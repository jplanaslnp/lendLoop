# 13 — Development Plan

## Purpose
Build LendLoop in small, reviewable phases. Each phase should result in a working increment. Do not automatically continue to the next phase.

## Development principles
1. Implement only the active phase.
2. Inspect current code and design before changing anything.
3. Preserve approved UI.
4. Backend authorization is mandatory from the first real-data phase.
5. Add tests with each business capability.
6. Report changed files, dependencies, tests, limitations and next phase.
7. Stop after the phase report.

---

# PHASE 0 — Requirements and design alignment

## Goal
Resolve conflicts between client brief, existing design and implementation assumptions.

## Scope
- Confirm LendLoop replaces “Share your tool” branding.
- Map existing screens to required views: Explore, My listings, My requests, Incoming requests.
- Confirm whether two-step pickup/return flow is desired.
- Confirm date semantics and cancellation policy.
- Confirm whether images are required in v1.
- Confirm public tool detail visibility and owner privacy.
- Identify admin UI scope.

## Deliver
A short decision log in `docs/DECISIONS.md`. No application code changes.

STOP.

---

# PHASE 1 — Repository and Next.js foundation

## Goal
Create a clean, reproducible web project.

## Scope
- Next.js 16 stable App Router.
- React and TypeScript strict mode.
- pnpm.
- Tailwind CSS.
- ESLint and formatter.
- Vitest/Jest decision and test setup.
- Playwright setup foundation.
- `.gitignore`, `.env.example`.
- Basic app shell and error/not-found boundaries.
- CI workflow for typecheck, lint, tests and build.

## Deliver
App runs locally; checks pass; clean Git baseline exists.

STOP.

---

# PHASE 2 — Design system and existing UI integration

## Goal
Translate the completed Claude Design output into production React components.

## Scope
- Inspect exported design code/assets.
- Establish design tokens and typography.
- Implement shared header, footer, buttons, cards, modal, form fields and navigation.
- Reproduce approved desktop/mobile Explore and product detail UI.
- Apply LendLoop brand name/tagline.
- Keep data mocked only where required to render UI.

## Rules
- Do not redesign.
- Do not add backend behavior yet.
- Avoid building all pages as one giant component.

## Deliver
Visual shell and key screens match approved designs at desktop/mobile widths.

STOP.

---

# PHASE 3 — Clerk authentication and protected UX

## Goal
Implement real authentication.

## Scope
- Clerk development application.
- Sign in / sign up UI integrated with approved modal pattern where supported.
- Session persistence and sign out.
- ClerkProvider and Convex provider wiring (Convex integration may be completed in Phase 4).
- Logged-out and logged-in navigation states.
- Protected routes/actions.
- Preserve return destination after sign-in.
- User provisioning design for Convex profile.

## Deliver
Users can authenticate and protected UI behaves correctly. Do not grant admin from client metadata.

STOP.

---

# PHASE 4 — Convex backend foundation and identity bridge

## Goal
Connect the application to Convex securely.

## Scope
- Create Convex dev deployment.
- Configure Clerk JWT integration.
- Add Convex schema for users, listings, borrow requests, automation events/reminders and audit logs.
- Add current-user profile query/provisioning mutation.
- Add reusable auth/role helpers.
- Add indexes.
- Add seed/development fixtures if useful.

## Deliver
Authenticated user can read their Convex profile. Schema and tests are in place.

STOP.

---

# PHASE 5 — Public Explore and category browsing

## Goal
Replace public mock list with Convex data.

## Scope
- Public query for active listings.
- Return only listing ID (if needed), name and category.
- Public Explore read-only list.
- Authenticated all-tools view.
- Category filters.
- Empty/loading/error states.
- No owner data in public response.

## Deliver
Public and authenticated browsing work against Convex.

STOP.

---

# PHASE 6 — Listing management

## Goal
Allow signed-in users to manage their own tools.

## Scope
- Create listing: name, category, condition, short description.
- My listings view.
- Edit own listing.
- Delete own listing.
- Validate category, condition, description length.
- Enforce owner checks in Convex.
- Add image upload only if approved in Phase 0.

## Deliver
End-to-end listing CRUD with ownership tests.

STOP.

---

# PHASE 7 — Borrow request creation and availability

## Goal
Allow users to request tools for a date range.

## Scope
- Product detail request flow.
- Date-range validation.
- Create pending request.
- My requests view.
- Prevent requesting own listing.
- Prevent invalid date ranges.
- Define and enforce overlap rules.
- Backend availability check.

## Deliver
Borrower can submit and track a pending request.

STOP.

---

# PHASE 8 — Incoming requests and loan lifecycle

## Goal
Allow owners to manage requests and complete loans.

## Scope
- Incoming requests view.
- Approve/decline actions.
- Re-check availability atomically on approval.
- Borrowing/Lending detail states.
- Implement approved pickup/return workflow.
- Overdue status determination.
- Status history/timestamps.
- Permissions per actor.

## Deliver
Complete tested request-to-return lifecycle.

STOP.

---

# PHASE 9 — Admin role and administration

## Goal
Implement admin capabilities required by client.

## Scope
- Secure admin role bootstrap.
- Admin-only listing removal.
- Admin view of all loans.
- Grant/revoke Trusted Lender.
- Audit log for admin actions.
- Minimal admin UI consistent with LendLoop design.
- Convex server-side enforcement for every admin operation.

## Deliver
Admin operations work and standard users cannot invoke them.

STOP.

---

# PHASE 10 — Automation foundation and request notifications

## Goal
Connect Convex events to n8n reliably.

## Scope
- Outbox/event records.
- Signed Convex-to-n8n webhook.
- HMAC verification in n8n.
- Request created/status changed workflow.
- Mock notification provider is acceptable initially.
- Idempotent event handling.
- Retry and error workflow.
- Sanitized workflow export.

## Deliver
Request events trigger a visible, secure, retryable n8n workflow.

STOP.

---

# PHASE 11 — Overdue reminders

## Goal
Send daily reminders for overdue loans.

## Scope
- Protected Convex HTTP endpoint to fetch eligible overdue loans.
- n8n daily schedule.
- Reminder deduplication key.
- Send reminder to borrower.
- Protected idempotent write-back.
- Retry/error handling.
- Reminder status in Convex.
- Optional recent automation activity UI.

## Deliver
Daily overdue reminders work without duplicate records on retries.

STOP.

---

# PHASE 12 — Hardening, documentation and delivery

## Goal
Prepare the repository for evaluation and a production discussion.

## Scope
- Full test pass.
- Permission/security review.
- Webhook replay and idempotency tests.
- Accessibility and responsive checks.
- Remove demo-only shortcuts.
- Export n8n JSON without secrets.
- Docker Compose for local n8n.
- Complete README and environment documentation.
- Production-readiness note.
- GitHub repository clean-up.

## Deliver
Complete source repository, exported workflows, reproducible setup and production notes.

STOP.

---

## Definition of done for every phase
- Scope completed without unrelated refactors.
- Typecheck, lint and relevant tests pass.
- Build passes when applicable.
- Changed files listed.
- Dependencies added/removed explained.
- Convex schema/function changes described.
- Manual verification described.
- Known limitations and risks listed.
- Next phase suggested.
- Claude stops and waits for approval.
