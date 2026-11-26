# 12 — Testing Strategy

## Goals
Protect:
- authorization and ownership;
- listing CRUD;
- request lifecycle;
- date-range availability;
- admin operations;
- webhook signatures;
- idempotency and retries;
- public data minimization.

## Unit tests
Test pure domain rules:
- allowed listing categories and conditions;
- valid date ranges;
- overlap detection;
- allowed loan status transitions;
- overdue determination;
- permission matrix;
- idempotency key generation.

## Convex function tests
Test as:
- logged-out caller;
- user A (owner);
- user B (borrower);
- unrelated user C;
- admin.

High-priority cases:
- unauthenticated user cannot create listing/request;
- user cannot edit/delete another user's listing;
- borrower cannot request own listing;
- owner cannot approve request for another owner's listing;
- unrelated user cannot read private request/loan details;
- admin can remove any listing;
- standard user cannot remove another user's listing;
- standard user cannot grant Trusted Lender;
- admin can grant/revoke Trusted Lender;
- public query returns no owner details;
- two overlapping requests cannot both be approved;
- repeated status mutation cannot produce duplicate transitions/events.

## Component tests
Use React Testing Library:
- public Explore shows only permitted data;
- category filters;
- sign-in CTA opens Clerk/auth flow;
- protected actions prompt authentication;
- forms show validation errors;
- status labels and actions reflect backend state;
- admin controls are not shown to standard users (UX only; backend tests remain mandatory).

## E2E tests
Use Playwright:
1. Logged-out visitor opens public Explore.
2. Visitor cannot see owner details.
3. Visitor attempts protected action and is prompted to sign in.
4. User signs in.
5. User creates listing.
6. Another user requests a date range.
7. Owner approves/declines.
8. Borrower sees updated status.
9. Loan is returned according to approved lifecycle.
10. Admin removes a listing.
11. Admin marks a lender Trusted Lender.

## Automation tests
- valid HMAC accepted;
- invalid HMAC rejected;
- stale timestamp rejected;
- duplicate event ignored;
- repeated write-back is idempotent;
- notification failure is visible and retryable;
- overdue workflow processes multiple loans without stopping on one recoverable failure;
- already-sent reminder is not sent again.

## Quality gates
A phase is complete only when:
- TypeScript passes;
- lint passes;
- formatting check passes;
- relevant tests pass;
- build passes;
- critical changed flow has been manually verified;
- no known security regression remains.
