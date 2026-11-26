# LendLoop

LendLoop is a neighbourhood tool-sharing web application. Neighbours can list tools, request to borrow them for a date range, approve incoming requests and manage loan returns.

## Product promise
**Borrow what you need. Lend what you don’t.**

## Technology
- Next.js 16 (App Router) + React + TypeScript
- Clerk for authentication and identity
- Convex for database, backend functions and reactive application data
- n8n for notification and overdue-reminder workflows
- Tailwind CSS for styling
- Vercel (recommended) for the Next.js deployment
- Convex Cloud for the backend deployment
- n8n Cloud or self-hosted Docker deployment for automation

See `docs/03_TECH_STACK.md` and `docs/04_ARCHITECTURE.md`.

## Documentation
The `docs/` directory is the project specification and development guide. Start with `CLAUDE.md`, then read `docs/13_DEVELOPMENT_PLAN.md` to understand the implementation phases.

## Local setup
The exact commands and environment variables must be completed during Phase 1. Do not commit `.env.local`, Clerk secret keys, Convex deployment secrets, HMAC secrets or n8n credentials.

Expected local services:
1. Next.js development server.
2. Convex development deployment (`npx convex dev`).
3. Clerk development application.
4. n8n local Docker instance when implementing automation (see `docs/11_AUTOMATION_N8N.md`).

## Project status
The repository is expected to be built phase by phase. Do not claim a feature is implemented until it exists in code and its tests pass.

## Production note
Before production, configure separate development and production Clerk/Convex/n8n environments, domain restrictions, backups/retention policies, monitoring, webhook authentication, rate limiting and tested recovery procedures. See `docs/15_ENVIRONMENT_AND_DEPLOYMENT.md` and `docs/16_PRODUCTION_CHECKLIST.md`.
