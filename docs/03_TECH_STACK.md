# 03 — Technology Stack

## Core stack
- Next.js 16 stable, App Router.
- React version supported by the selected Next.js 16 release.
- TypeScript with strict mode.
- pnpm as the single package manager.
- Tailwind CSS, matching the approved design.
- Clerk for authentication and session management.
- Convex for database, server functions, reactive queries and HTTP actions.
- n8n for external notification and overdue-reminder orchestration.
- Vercel recommended for hosting Next.js.
- Convex Cloud for hosted backend/database.
- n8n Cloud or Docker Compose for workflow runtime.

## Version policy
At project bootstrap, check the latest stable patch versions compatible with one another. Use stable releases only; do not use canary, nightly or experimental packages in the main application. Pin versions through the lockfile. Upgrade deliberately with tests.

Next.js 16 is the selected major because it is the current Active LTS line at the time this document was prepared. If a newer major becomes stable before implementation, assess compatibility and support policy before changing this decision.

## Clerk
Responsibilities:
- Sign up / sign in / sign out.
- Session lifecycle.
- OAuth providers if enabled.
- User identity and verified contact information.
- Admin identity mapping through a trusted server-side role record/claim.

Do not use Clerk public metadata as the sole authority for admin authorization. Convex must verify trusted identity and role from a protected source.

## Convex
Responsibilities:
- Canonical application data.
- Tool listing CRUD.
- Borrow request and loan state.
- Queries, mutations and actions.
- Authorization checks.
- Scheduled/internal functions where appropriate.
- HTTP endpoints for n8n integration.
- Automation event and idempotency records.

Convex is both a database and backend platform. A separate PostgreSQL database is not required for this MVP.

## n8n
Responsibilities:
- Receive signed request/status events.
- Send notifications through the selected provider or mock logger.
- Run daily overdue checks.
- Call protected Convex endpoints.
- Record delivery outcomes through idempotent write-back.
- Surface failed executions through error workflow/alerts.

n8n is not the source of truth for listing or loan state.

## Forms and validation
Recommended:
- React Hook Form for complex forms.
- Zod for frontend schemas and shared client-side validation.

Backend validation must still use Convex validators and server-side business rules. Frontend validation is not authorization.

## UI
- Reuse existing approved design components.
- Tailwind CSS.
- Lucide React icons if consistent with the existing design.
- Avoid introducing a second component library without a clear need.

## Testing
- Vitest or Jest for unit tests (choose one in Phase 1).
- React Testing Library for components.
- Playwright for browser end-to-end tests.
- Convex test utilities or isolated test deployments for backend functions.
- Contract tests for signed webhook endpoints.

## Monitoring
For MVP:
- Convex dashboard logs.
- n8n execution history and error workflow.
- Vercel deployment/runtime logs.

Sentry may be added before production if needed; avoid adding analytics or collecting unnecessary personal data by default.

## Not selected
- No separate PostgreSQL/Supabase database for the MVP.
- No Redux unless a real client-state requirement emerges.
- No custom authentication implementation.
- No direct browser-to-n8n calls.
