# 04 — Architecture

## High-level system

```text
Browser
  |
  v
Next.js 16 (App Router / React)
  |                         \
  | Clerk session/JWT         \ public UI assets
  v                            \
Clerk --------------------------+
  |
  | authenticated JWT
  v
Convex client/provider
  |
  v
Convex backend
  |-- Queries: read data (reactive)
  |-- Mutations: transactional writes
  |-- Actions: external API calls
  |-- Internal functions: privileged workflows
  |-- HTTP Actions: protected n8n endpoints
  |
  +---- Convex database
  |
  +---- signed event webhook ----> n8n
                                  |-- notification provider/mock
                                  |-- daily schedule
                                  |-- overdue fetch
                                  |-- idempotent write-back
```

## Source of truth
Convex is the canonical source of truth for:
- users/application profiles and roles;
- listings;
- borrow requests/loans;
- availability;
- trusted-lender state;
- automation events and reminder records.

Clerk is the source of truth for authentication identity and sessions. Store the Clerk subject/user ID as the external identity key in Convex.

n8n stores workflow execution state, but must not independently determine whether a loan is approved, returned or overdue.

## Application layers
- `app/`: Next.js routes and layouts; keep route files thin.
- `src/features/`: feature-specific UI and hooks.
- `src/components/`: shared presentation components.
- `src/lib/`: providers, utilities and integrations.
- `src/domain/`: pure business rules and types where useful.
- `convex/`: schema and backend functions.
- `n8n/workflows/`: exported workflow JSON without secrets.
- `docs/`: product and engineering documentation.

## Data flow
1. Browser renders public or authenticated UI.
2. Clerk provides the current authenticated identity.
3. Convex validates the Clerk JWT.
4. Convex function derives the caller identity from `ctx.auth`; never accept a caller ID as proof of identity.
5. Function loads the caller's profile/role and checks permissions.
6. Function validates state transition and writes transactionally.
7. For notification-worthy events, a durable event/outbox record is created.
8. A Convex action or scheduled dispatcher sends a minimal signed payload to n8n.
9. n8n performs notification and reports outcome to a protected Convex endpoint.
10. Convex records delivery status idempotently.

## Availability and concurrency
Availability must be checked on the backend when approving a request, not only when the date picker is rendered. Concurrent requests can race. The approval mutation must re-check for overlapping approved/active loans and atomically reject an invalid transition.

Define date semantics consistently: use calendar dates (`YYYY-MM-DD`) for requested borrowing days unless the product owner explicitly requires times/time zones. Store normalized UTC timestamps only where time-of-day is needed.

## Public vs private reads
Public listing queries must return a deliberately restricted DTO containing only fields approved for logged-out users (at minimum tool name and category). Do not query full listing documents and merely hide owner fields in React.

## Reliability
External network calls must not happen inside a database transaction. Use an outbox/event record and retryable dispatcher pattern. Record attempt count, status, next retry time and last error category without logging sensitive payloads.

## Deployment topology
- Next.js app: Vercel.
- Convex: separate development and production deployments.
- Clerk: separate development and production instances/configurations.
- n8n: local Docker for development; hosted or secured self-hosted instance for production.
