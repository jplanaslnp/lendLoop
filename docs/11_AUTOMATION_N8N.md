# 11 — n8n Automation Architecture

## Principles
- Convex is the source of truth.
- n8n orchestrates external side effects only.
- No direct browser-to-n8n calls.
- Payloads contain the minimum fields required.
- All writes back to Convex are authenticated and idempotent.
- Failed executions must be visible.

## Workflow A — Borrow request/status notification

### Trigger
A borrow request is created or changes status in Convex.

### Recommended flow
1. Convex mutation updates the request and creates an `automationEvents` outbox record in the same transaction.
2. A Convex dispatcher/action sends a signed HTTP POST to an n8n Webhook.
3. n8n verifies HMAC signature and timestamp.
4. n8n validates event schema and deduplicates by `eventId`.
5. n8n resolves notification recipient/channel.
6. Send email, Slack, Discord or log a mock notification.
7. n8n calls a protected Convex write-back endpoint with event ID, result and provider reference (if any).
8. Convex marks event sent/failed idempotently.

### Minimal payload example
```json
{
  "eventId": "stable-unique-event-id",
  "eventType": "borrow_request_status_changed",
  "occurredAt": "ISO-8601 timestamp",
  "requestId": "Convex document ID",
  "recipientUserId": "internal user ID",
  "status": "approved"
}
```
Do not include address, password, Clerk tokens or unnecessary profile data.

## Workflow B — Daily overdue reminders

### Trigger
n8n Schedule Trigger, once daily at a configured time and timezone.

### Flow
1. Schedule Trigger starts workflow.
2. HTTP Request calls a protected Convex overdue endpoint.
3. Convex returns only overdue loans eligible for a reminder and a deterministic reminder key.
4. n8n iterates through results.
5. Send one reminder per eligible borrower/loan.
6. Write result back to Convex using reminder key.
7. Convex records status only once for that reminder key.
8. Workflow records errors and continues with remaining items where safe.

### Idempotency
Use deterministic key, for example:
`overdue:<loanId>:<YYYY-MM-DD>:<reminderType>`

Before sending, check whether that reminder key is already marked sent. Write-back must be idempotent. Consider the delivery ambiguity where a provider accepted a message but the workflow timed out before write-back; use provider idempotency support where available, otherwise document at-least-once delivery risk.

## HMAC contract
Agree one canonical signing format and implement the same algorithm in both systems.

Recommended headers:
- `X-LendLoop-Timestamp`
- `X-LendLoop-Event-Id`
- `X-LendLoop-Signature`

Recommended signature:
`hex(HMAC-SHA256(secret, timestamp + "." + rawRequestBody))`

Requirements:
- Verify raw body bytes/text exactly as signed.
- Constant-time signature comparison.
- Reject missing headers, malformed signatures and stale timestamps.
- Use separate secrets for each direction or endpoint where practical.
- Add replay/idempotency protection using event ID.
- Never store secret in workflow JSON.

## Failure handling
- Configure retry with bounded attempts and backoff.
- Add n8n Error Trigger workflow or equivalent error path.
- Persist failed event status in Convex.
- Do not silently drop an event.
- Avoid infinite retry loops.
- Keep a manual replay procedure documented.
- Redact payloads from execution logs where they may contain personal data.

## Exported workflow files
Store sanitized exports in:
- `n8n/workflows/request-notification.json`
- `n8n/workflows/overdue-reminders.json`
- `n8n/workflows/error-handler.json` (if separate)

Before committing exports:
- remove credentials;
- remove secret values;
- remove environment-specific URLs where possible or replace with documented placeholders;
- verify no tokens or personal data remain.

## Local development
Provide Docker Compose for n8n during the automation phase. Persist n8n data in a local volume. Protect the editor with local credentials and do not expose it publicly without TLS and authentication.

## Bonus UI
If time permits, show recent automation activity on loan details (e.g. “Reminder sent 2 days ago”) using Convex records, not direct n8n API calls from the browser.
