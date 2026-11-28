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
Do not commit `.env.local`, Clerk secret keys, Convex deployment secrets, HMAC secrets or n8n credentials.

### Prerequisites
- Node.js 24 LTS (pinned in `.nvmrc`; run `nvm use`). Node 25 is not supported by the test tooling.
- pnpm 10.32.1 (pinned in `package.json` `packageManager`; `corepack enable` selects it automatically).

### First run
```bash
nvm use
pnpm install
cp .env.example .env.local   # then add the Clerk development keys
npx convex dev               # terminal 1: links the Convex dev deployment, writes NEXT_PUBLIC_CONVEX_URL
pnpm dev                     # terminal 2: http://localhost:3000
```

The Convex deployment needs `CLERK_JWT_ISSUER_DOMAIN` (your Clerk Frontend API URL) in its own environment variables, and Clerk's Convex integration must be active so session tokens carry `aud: "convex"`.

### Development seed data
Explore starts empty until listings exist. To load the design's 13 demo tools (owned by fictional neighbours) into your **development** deployment:
```bash
npx convex env set LENDLOOP_DEV_SEED enabled   # once, dev deployment only
npx convex run seed:run                        # safe to repeat: updates, never duplicates
```
To remove the demo data again (only seed rows are deleted; real accounts are untouched):
```bash
npx convex run seed:clear
```
Never set `LENDLOOP_DEV_SEED` on a production deployment; without it both functions refuse to run. The end-to-end tests expect the seed data to be present.

### Photo uploads
Listing photos are uploaded to the Convex HTTP endpoint `POST /photos` (on the `.convex.site` URL). The deployment must allow the app's origin:
```bash
npx convex env set APP_ORIGINS "http://localhost:3000,http://localhost:3100"   # dev
```
Set it to your production site on the production deployment when you deploy. Unpublished photos are deleted after 24 hours by a daily Convex cron.

For end-to-end tests, install the Playwright browser once:
```bash
pnpm exec playwright install chromium
```
The signed-in e2e tests use Clerk **development** test users (`+clerk_test` emails, code 424242), read from your local environment only: `E2E_CLERK_USER_EMAIL` / `E2E_CLERK_USER_PASSWORD` (borrower) and, for the borrowing tests, a second user `E2E_CLERK_OWNER_EMAIL` / `E2E_CLERK_OWNER_PASSWORD` (owner). Tests whose variables are missing are skipped. Never commit these values.

### Scripts
| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` / `pnpm start` | Production build / serve the production build |
| `pnpm typecheck` | Generate Next.js route types and run `tsc --noEmit` |
| `pnpm lint` | ESLint (zero warnings allowed) |
| `pnpm format` / `pnpm format:check` | Prettier write / verify |
| `pnpm test` | Vitest unit/component tests (`tests/unit`) and Convex function tests (`tests/convex`) |
| `pnpm test:e2e` | Playwright end-to-end tests (`tests/e2e`, desktop + mobile Chromium) |
| `pnpm check` | typecheck + lint + format check + unit tests |

CI (`.github/workflows/ci.yml`) runs the same checks plus the production build and Playwright tests.

### Design reference
`design/` holds the original Claude Design export and is an immutable visual reference. It is excluded from TypeScript, ESLint, Prettier and Tailwind scanning, and is never imported by the app. The original export is recoverable from the `design-baseline` Git tag.

Expected local services:
1. Next.js development server.
2. Convex development deployment (`npx convex dev`).
3. Clerk development application.
4. n8n local Docker instance when implementing automation (see `docs/11_AUTOMATION_N8N.md`).

## Project status
The repository is expected to be built phase by phase. Do not claim a feature is implemented until it exists in code and its tests pass.

## Production note
Before production, configure separate development and production Clerk/Convex/n8n environments, domain restrictions, backups/retention policies, monitoring, webhook authentication, rate limiting and tested recovery procedures. See `docs/15_ENVIRONMENT_AND_DEPLOYMENT.md` and `docs/16_PRODUCTION_CHECKLIST.md`.
