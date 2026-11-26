# 01 — Project Context

## What LendLoop is
LendLoop is a responsive neighbourhood tool-sharing marketplace. People in the same residential community can make useful tools available to neighbours and borrow tools they need temporarily.

## Product tagline
“Borrow what you need. Lend what you don’t.”

## Core value
Make borrowing local items practical, safe and easy without requiring neighbours to buy tools they only need occasionally.

## Platforms
- Responsive web application.
- Desktop and mobile browser layouts.
- This is not a native iOS/Android application.

## Main user journeys
1. Visitor opens the public Explore page and sees a read-only list of available tools.
2. Visitor chooses Sign in to lend or borrow and authenticates through Clerk.
3. Signed-in user browses all tools and filters by category.
4. User lists a tool they own.
5. Another user requests that tool for a date range.
6. Owner approves or declines the request.
7. Borrower and owner coordinate pickup/return and update the loan lifecycle.
8. Admin can moderate listings, inspect loans and mark lenders as trusted.

## Product roles
- `user`: standard authenticated member.
- `admin`: trusted platform administrator with explicitly defined elevated permissions.

A lender is not a separate system role. A standard user can lend and borrow. “Trusted Lender” is an admin-managed trust flag/badge, not a permission role.

## Brand
Final product name: **LendLoop**.
Legacy design prototypes may say “Share your tool”. Update the visible branding to LendLoop while preserving the approved visual system and layouts.

## Product principles
- Minimal, friendly and practical UX.
- Clear availability and date-range selection.
- No exposure of private owner details to logged-out visitors.
- Clear distinction between a borrow request and an active loan.
- Backend-enforced authorization.
- Reliable notifications that do not duplicate on retries.
- Collect only data needed to operate local sharing.

## Out of scope unless explicitly approved
- Payments, deposits, rental fees or marketplace commissions.
- Delivery/shipping logistics.
- Public exact home addresses.
- Chat/messaging system.
- Native mobile applications.
- Reviews/ratings beyond the admin-controlled Trusted Lender indicator.
