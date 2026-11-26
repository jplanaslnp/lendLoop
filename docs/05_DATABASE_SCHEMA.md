# 05 — Database Schema (Convex)

This is the proposed logical schema. Confirm exact Convex validators and indexes during the database phase. Keep the model minimal and avoid duplicating Clerk identity data unnecessarily.

## `users`
Application profile keyed by Clerk subject.
- `clerkId: string` (unique logical identity; index)
- `email: string` (only if needed for app operations; prefer verified Clerk data when possible)
- `name: string`
- `role: "user" | "admin"`
- `isTrustedLender: boolean` (default false)
- `createdAt: number`
- `updatedAt: number`
- optional `disabledAt: number`

Do not allow users to set their own role or trusted status.

## `listings`
- `ownerId: Id<"users">`
- `name: string`
- `category: ListingCategory`
- `condition: "new" | "like_new" | "good" | "fair"`
- `description: string`
- `status: "active" | "removed" | "archived"` (final states to confirm)
- `createdAt: number`
- `updatedAt: number`
- optional `imageStorageIds` if image uploads are approved.
- optional `removedAt`, `removedBy`, `removalReason` for admin moderation/audit.

Indexes:
- by owner
- by status
- by category and status
- by owner and status

Public query should return only `name` and `category` (plus a stable listing ID if needed for opening details). Do not include owner fields.

## `borrowRequests`
A request may become a loan after approval. Recommended single lifecycle record to avoid duplicate request/loan records.
- `listingId: Id<"listings">`
- `ownerId: Id<"users">`
- `borrowerId: Id<"users">`
- `startDate: string` (`YYYY-MM-DD`)
- `endDate: string` (`YYYY-MM-DD`, inclusive or exclusive must be decided; recommended exclusive end date internally)
- `status: "pending" | "approved" | "ready_for_pickup" | "borrowed" | "overdue" | "return_pending" | "returned" | "declined" | "cancelled"`
- `createdAt`, `updatedAt`
- `approvedAt?`, `readyAt?`, `pickedUpAt?`, `returnedAt?`, `declinedAt?`, `cancelledAt?`
- `dueAt` or derived due date
- `cancelledBy?`
- `declineReason?` (optional, avoid requiring personal details)
- `idempotencyKey?` for client retry protection if needed.

Indexes:
- by listing
- by owner
- by borrower
- by status
- by status and due date
- by owner and status
- by borrower and status

The final schema should avoid trusting duplicated `ownerId`: derive it from the listing during creation and validate consistency on every relevant mutation.

## `automationEvents`
Outbox and notification activity.
- `eventKey: string` (unique logical idempotency key)
- `eventType: "borrow_request_created" | "borrow_request_status_changed" | "overdue_reminder"`
- `requestId: Id<"borrowRequests">`
- `recipientUserId: Id<"users">`
- `status: "pending" | "processing" | "sent" | "failed"`
- `attemptCount: number`
- `createdAt`, `updatedAt`
- `sentAt?`
- `lastErrorCode?`
- minimal non-sensitive metadata only.

Indexes:
- by eventKey
- by status and createdAt
- by request

## `automationReminders`
Tracks overdue reminders per loan and scheduled reminder occurrence.
- `reminderKey: string` (unique; e.g. request ID + reminder date/type)
- `requestId`
- `borrowerId`
- `reminderDate: string`
- `status: "pending" | "sent" | "failed"`
- `attemptCount`
- `createdAt`, `updatedAt`
- `sentAt?`
- `lastErrorCode?`

Index by reminderKey and by requestId.

## `adminAuditLogs`
- `adminUserId`
- `action: "listing_removed" | "trusted_lender_granted" | "trusted_lender_revoked"`
- `targetType`
- `targetId`
- `reason?`
- `createdAt`

Do not expose audit logs to standard users.

## Schema principles
- Use Convex `v` validators for every function argument and document field.
- Use indexes for common access patterns; do not collect entire tables for filtering.
- Store timestamps as milliseconds since epoch where actual instants are needed.
- Store date-only borrow periods as normalized ISO dates.
- Never store passwords or authentication secrets.
- Keep public read models separate from private user/loan documents.
