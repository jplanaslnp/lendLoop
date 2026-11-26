# 06 — Business Rules and Loan Lifecycle

## Actors
- Owner: user who created the listing.
- Borrower: user requesting to borrow a listing.
- Admin: platform operator with elevated moderation permissions.

A standard user can be both owner and borrower on different records.

## Listing rules
- A user can create listings only while authenticated.
- A user can edit/delete only listings where they are the owner.
- Admin can remove any listing.
- Removed/archived listings cannot receive new requests.
- Listing owner must be derived from authenticated caller, not client input.
- A user cannot request their own listing.

## Request creation
- Borrower must be authenticated.
- Listing must exist and be active.
- Borrower cannot request own listing.
- Start date must be valid and end date must be after start date.
- Reject requests whose date range conflicts with an already approved/active loan.
- Pending requests may overlap unless product owner chooses a stricter policy; approval must re-check availability.
- Request creation creates a `pending` record and a notification event.

## Recommended lifecycle

```text
pending
  ├── owner approves ──> approved
  ├── owner declines ──> declined
  └── borrower cancels ─> cancelled

approved
  ├── owner marks ready ─> ready_for_pickup
  └── cancellation (policy to confirm)

ready_for_pickup
  ├── borrower confirms pickup ─> borrowed
  └── cancellation (policy to confirm)

borrowed
  ├── borrower initiates return ─> return_pending
  └── due date passes ─> overdue

overdue
  └── borrower initiates return ─> return_pending

return_pending
  └── owner confirms receipt ─> returned
```

This is the recommended UX lifecycle based on the designed product flow. The client brief only explicitly says “mark a loan as returned”; confirm whether the two-step pickup/return confirmation is required before implementation. If the client expects a simpler one-step return, document the approved alternative.

## Transition permissions
- Only listing owner can approve/decline a request for their listing.
- Only borrower can initiate a request and confirm pickup/return (if two-step flow is approved).
- Only owner can mark ready for pickup and confirm item received back (if two-step flow is approved).
- Admin may inspect all loans. Admin must not silently impersonate either party.
- All transitions validate current status server-side.
- Invalid or repeated transitions return a controlled error.

## Date and availability rules
- Define whether end date is inclusive or exclusive before implementing date logic. Recommended internal convention: half-open interval `[startDate, endDate)` to avoid boundary ambiguity.
- Approval mutation checks all other approved/ready/borrowed/overdue/return_pending records for overlapping intervals.
- Use a transactional mutation to avoid two owners/requests being approved concurrently for the same listing.
- Pending requests do not reserve dates unless product owner explicitly decides otherwise.
- Returned, declined and cancelled records do not block future availability.

## Overdue
- A loan becomes overdue when current time/date is past its due date and it has not reached `return_pending` or `returned`.
- Overdue determination must be server-side and deterministic.
- Do not rely on the browser being open.
- Do not auto-mark a loan as returned.
- A reminder does not change loan status.

## Cancellation / extension
The client brief does not specify cancellation or extensions. Do not implement these in the first pass without product-owner approval. Recommended future rules:
- borrower may cancel pending request;
- approved cancellation may require owner consent or a defined cutoff;
- active loan cannot be cancelled; it must follow return process;
- extensions are new date-range requests approved by owner.

## Notifications
Create notification events for:
- request created (notify owner);
- request approved/declined (notify borrower);
- any other status transition that requires the other party to act.
Only send minimum necessary fields.

## Concurrency and idempotency
- Use a unique event key per business event.
- Do not create duplicate request events on client retries.
- Check expected current status inside the mutation.
- Re-check listing ownership and availability at the moment of transition.
