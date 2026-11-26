# LendLoop — Claude Code project instructions

## Mandatory starting point
Before making changes, read:
1. `docs/01_PROJECT_CONTEXT.md`
2. `docs/02_PRODUCT_REQUIREMENTS.md`
3. `docs/03_TECH_STACK.md`
4. `docs/04_ARCHITECTURE.md`
5. The task-specific documents listed below.

Then inspect the existing repository and current implementation. Existing code and approved design are authoritative for implementation details unless they conflict with an explicit product requirement or a documented security rule.

## Task-to-document map
- UI/design: `docs/08_DESIGN_UI.md`
- Data model: `docs/05_DATABASE_SCHEMA.md`
- Loan lifecycle: `docs/06_BUSINESS_RULES.md`
- Authentication/RBAC: `docs/07_AUTH_AND_PERMISSIONS.md`
- Security: `docs/10_SECURITY.md`
- n8n: `docs/11_AUTOMATION_N8N.md`
- Tests: `docs/12_TESTING.md`
- Roadmap: `docs/13_DEVELOPMENT_PLAN.md`
- Working process: `docs/14_CLAUDE_CODE_WORKFLOW.md`
- Environment/deployment: `docs/15_ENVIRONMENT_AND_DEPLOYMENT.md`

## Non-negotiable rules
- Implement only the currently requested phase. Do not silently start the next phase.
- Preserve approved visual design. Do not redesign existing screens unless explicitly asked.
- Never trust client-supplied user IDs, roles, ownership, loan status, prices, or permissions.
- Enforce authorization and business rules inside Convex functions. UI visibility is not security.
- Use Clerk as identity provider and Convex as the canonical application data/backend.
- Never expose secrets in browser code, source control, logs, screenshots, or exported n8n workflow JSON.
- Do not create a second database or duplicate source of truth.
- Do not store unnecessary personal information or expose owner details to logged-out visitors.
- Validate every public Convex function argument with Convex validators.
- Use internal Convex functions for privileged internal operations.
- Use idempotency for external side effects and automation write-backs.
- Do not invent product requirements. If a decision materially affects security, data model, money, privacy, or loan lifecycle, identify the ambiguity and ask.
- Avoid `any`; keep TypeScript strict.
- Prefer small, feature-oriented modules over giant files.
- Do not add dependencies without explaining why they are needed.

## Phase workflow
Follow `docs/14_CLAUDE_CODE_WORKFLOW.md` for every task. At the end, run the relevant checks, report changed files, tests, limitations and next recommended phase, then STOP.

## Product identity
The client brief names the product **LendLoop**. Use LendLoop in application copy and metadata. Earlier design references may contain the temporary name “Share your tool”; treat that as legacy branding, not the final product name.

## Current scope
This is a responsive web application built with Next.js App Router, not a native mobile app.
