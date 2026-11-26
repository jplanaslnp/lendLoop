# 10 — Security and Data Minimization

## Security model
The browser is untrusted. Every client action can be forged. Convex is the authorization boundary for application data.

## Authentication
- Validate Clerk JWTs in Convex using the official integration.
- Derive current user from Convex auth context.
- Reject missing, invalid or disabled identities.
- Never trust IDs or roles sent by the browser.

## Authorization
- Enforce ownership and role checks in every relevant Convex query/mutation/action.
- Use internal functions for privileged internal work.
- Keep admin-only operations separate and audited.
- Test access using unrelated users, logged-out users and admin users.

## Public data
The logged-out listing query must return only the approved public fields (tool name and category, plus ID if necessary). Do not serialize a complete listing and hide fields in the frontend.

## Input validation
- Validate all function arguments with Convex validators.
- Enforce string length limits, allowed category/condition values and valid date ranges.
- Normalize dates before overlap checks.
- Escape/render user text safely; do not use unsafe HTML injection.
- Apply rate limiting or abuse controls to high-impact public endpoints where appropriate.

## Webhook security
- HMAC-sign webhook payloads.
- Include timestamp and unique event ID in the signed canonical payload.
- Verify signature using constant-time comparison.
- Reject stale timestamps outside a short configured tolerance.
- Maintain idempotency keys to prevent replay/duplicate side effects.
- Keep shared secrets in environment variables and n8n credentials.
- Never include secrets in exported workflow JSON or Git.

## Data minimization
- Do not expose owner details to logged-out visitors.
- Do not store passwords; Clerk owns authentication credentials.
- Avoid storing full addresses unless a confirmed product requirement requires them.
- Store only the location detail needed for local matching/pickup coordination.
- Do not send email, address or profile data to n8n unless strictly required by the notification channel.
- Use stable internal IDs in automation payloads and fetch additional allowed data server-side when necessary.
- Avoid logging full payloads, emails, addresses or tokens.

## Admin audit
Audit:
- listing removal;
- Trusted Lender grant/revoke;
- any future admin mutation affecting users or loans.

Store actor, action, target, timestamp and optional reason.

## Secrets
- `.env.local` is ignored by Git.
- `.env.example` contains variable names and safe placeholders only.
- Clerk secret key is server-only.
- Convex deployment/admin secrets are never browser-exposed.
- n8n credentials are stored in n8n credential storage.
- HMAC secrets are not embedded in code or workflow exports.
- Rotate secrets if exposed.

## Production hardening
- Rate limits and abuse detection.
- Restrict admin access and enable MFA where available.
- Review provider retention and data region.
- Backups and recovery drills.
- Dependency/security updates.
- Least-privilege service credentials.
