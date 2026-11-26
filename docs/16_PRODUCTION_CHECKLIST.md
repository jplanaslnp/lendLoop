# 16 — Production Checklist and Production Note

## Application
- [ ] Next.js production build succeeds.
- [ ] Responsive layouts checked on desktop and mobile.
- [ ] Public Explore returns only approved public fields.
- [ ] Authenticated routes/actions protected.
- [ ] All user permissions enforced in Convex.
- [ ] Admin permissions enforced and audited.
- [ ] Listing and loan lifecycle tested.
- [ ] Date overlap concurrency tested.
- [ ] Empty/loading/error states handled.
- [ ] Accessibility basics checked.

## Clerk and Convex
- [ ] Separate production Clerk instance/configuration.
- [ ] Separate production Convex deployment.
- [ ] Clerk JWT integration verified in production.
- [ ] Admin role bootstrap secured.
- [ ] Convex functions validated and indexed.
- [ ] No privileged secrets in browser bundle.

## n8n
- [ ] Request notification workflow imported and enabled.
- [ ] Overdue reminder workflow imported and enabled.
- [ ] Error workflow configured.
- [ ] HMAC verified in both directions.
- [ ] Idempotency tested under retries.
- [ ] Workflow exports contain no credentials/secrets.
- [ ] Failed executions visible and actionable.

## Operations
- [ ] HTTPS and custom domain.
- [ ] Environment variables set per environment.
- [ ] Backups/retention plan.
- [ ] Monitoring and alerting.
- [ ] Rate limiting/abuse controls.
- [ ] Privacy policy and terms reviewed.
- [ ] Data retention/deletion policy defined.
- [ ] Incident and secret-rotation procedure.

## Short production-readiness note
The MVP architecture is suitable for a small-to-medium evaluation deployment. Before real production use, I would add a formal operational review of Convex access patterns and limits, stronger abuse/rate controls, provider delivery guarantees, structured monitoring/alerting, automated backup/restore exercises, privacy/legal review, and a documented incident response process. I would also validate the n8n hosting model and webhook throughput under expected load, and consider a dedicated notification provider with delivery tracking if notifications become business-critical.
