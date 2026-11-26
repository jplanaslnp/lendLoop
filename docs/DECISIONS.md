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
