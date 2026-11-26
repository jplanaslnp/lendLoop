# 15 — Environment and Deployment

## Environments
Maintain separate development and production environments for:
- Clerk;
- Convex;
- n8n;
- Next.js deployment.

Never point local development at production data by default.

## Environment variables
Create `.env.example` with names and placeholders only. Exact variable names must follow the selected SDK versions and deployment configuration.

Expected categories:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY` (server only)
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOY_KEY` (deployment/CI only; never browser)
- `N8N_WEBHOOK_URL` (server only)
- `N8N_SHARED_HMAC_SECRET` (server only)
- `CONVEX_N8N_SHARED_HMAC_SECRET` or separate directional secrets
- notification provider credentials (stored in n8n credentials where possible)
- `NEXT_PUBLIC_APP_URL` where required

Do not assume all secrets belong in the Next.js environment. Prefer n8n credentials for provider credentials and Convex environment variables for backend-only secrets.

## Local development
Expected:
1. Install dependencies with pnpm.
2. Configure Clerk development keys.
3. Configure Convex development deployment.
4. Run `npx convex dev` in its own terminal.
5. Run `pnpm dev`.
6. Start n8n with Docker Compose during automation phases.

## n8n Docker Compose
Add a `docker-compose.yml` or dedicated compose file in the automation phase. Use a persistent volume and local-only credentials. Do not commit actual credentials. Document the supported n8n version and update it deliberately.

## Deployment recommendation
- Next.js: Vercel.
- Convex: Convex Cloud.
- Clerk: Clerk hosted service.
- n8n: n8n Cloud for simplest operations, or self-hosted Docker on a managed server with TLS, authentication, backups and monitoring.

## CI/CD
GitHub Actions should run:
- install with frozen lockfile;
- typecheck;
- lint;
- unit/integration tests;
- production build.

Deployment secrets must be stored in the CI platform, not repository files.

## Production safeguards
- Separate production Clerk and Convex projects.
- Restrict admin bootstrap.
- Verify all webhook URLs and signatures.
- Back up workflow definitions and required n8n data.
- Configure domain, HTTPS and allowed origins.
- Establish monitoring and alerting.
- Test rollback and restore procedures.
