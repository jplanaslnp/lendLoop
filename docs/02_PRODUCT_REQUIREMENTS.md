# 02 — Product Requirements

This document translates the client brief into testable product requirements. Where a requirement is ambiguous, it is marked OPEN rather than silently invented.

## Public page (logged out)
- Product name: LendLoop.
- Tagline: “Borrow what you need. Lend what you don’t.”
- Show a read-only list of available tools fetched from Convex.
- Public list displays tool name and category only. Do not return owner identity or owner details from the public query.
- Show a “Sign in to lend or borrow” CTA connected to Clerk.
- Public visitors cannot create listings or requests.

## Authenticated experience
Only authenticated users can:
- Create a tool listing with name, category, condition and short description.
- Edit and delete their own listings.
- Request to borrow another user's tool for a date range.
- Approve or decline incoming requests for their own tools.
- Manage their own requests and loans.
- Mark a loan as returned / confirm return according to the approved lifecycle.
- Browse all active/available tools and filter by category.

Required views:
- All tools
- My listings
- My requests
- Incoming requests

The previously designed Borrowing and Lending areas can map to My requests and Incoming requests respectively. Keep navigation labels aligned with the approved UI unless a deliberate product decision changes them.

## Tool listing fields
Required:
- `name`
- `category`
- `condition`
- `description`

Categories should be centrally defined and validated. Initial suggested categories:
- Power tools
- Garden
- Kitchen
- Camping
- Sports & fitness
- Electronics
- Cleaning
- DIY & tools
- Party & events
- Baby & kids
- Books & games
- Other

The exact final category list can be adjusted before seed data is created.

Condition values:
- New
- Like new
- Good
- Fair

Description should be short. UI should communicate a sensible character limit (suggested 300 characters).

Images are present in the approved design concept, but the client brief does not explicitly require image upload. Treat image storage as a planned enhancement/OPEN decision and do not block core listing CRUD on it unless the product owner confirms.

## Borrow requests
- A request references one listing and one borrower.
- A request includes start and end dates.
- The owner can approve or decline.
- The borrower can view request status.
- Approved requests reserve the relevant date range.
- Overlapping approved/active loans must not be allowed.

## Roles
### user
- Create, edit and delete only their own listings.
- Request borrowing of listings owned by other users.
- View/manage only requests and loans involving their own listings or their own borrowing.
- Cannot perform admin operations.

### admin
- Remove any listing.
- View all loans.
- Mark a lender as Trusted Lender and revoke that status.
- Admin actions must be auditable.

## Automation requirements
### Request notification
When a borrow request is created or changes status, Convex triggers an authenticated n8n webhook. The workflow sends a notification to the relevant user. Email, Slack, Discord or logged mock notifications are acceptable for the evaluation. Send only the minimum fields required.

### Overdue reminders
- A scheduled n8n workflow runs daily.
- It fetches overdue loans from a protected Convex HTTP endpoint.
- It sends a reminder to each borrower.
- It writes reminder status back to Convex.
- Retries must not create duplicate reminders.

### Security/reliability
- HMAC-sign webhook payloads and verify signatures at the receiving side.
- Keep secrets in environment variables / n8n credentials, never in code or exported workflow JSON.
- Idempotent write-backs.
- Retries and visible error handling; no silent failures.
- Bonus: show recent automation activity on each loan, e.g. “Reminder sent 2 days ago”.

## Deliverables
- GitHub repository with source.
- Exported n8n workflow JSON files.
- README covering local setup, n8n/Docker, env vars, architecture, security and data minimisation.
- Short production-readiness note.

## OPEN product decisions
1. Whether listings require one or more photos in v1.
2. Whether exact pickup address is ever shown, and at which loan state.
3. Whether borrowers can cancel pending/approved requests and the precise cutoff.
4. Whether users can request date extensions.
5. Whether there is a separate handover confirmation step.
6. Whether notifications use email, Slack, Discord or mock logging for the evaluation.
7. Whether “mark a loan as returned” means borrower marks returned, owner confirms receipt, or one-sided completion. Recommended lifecycle is in `06_BUSINESS_RULES.md`; confirm before implementation.
