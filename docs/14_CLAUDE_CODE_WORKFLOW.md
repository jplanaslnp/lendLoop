# 14 — Claude Code Workflow

## Standard workflow

```text
User task
→ read CLAUDE.md
→ read relevant docs
→ inspect repository and current implementation
→ inspect approved design
→ identify conflicts/ambiguities
→ propose scoped approach
→ ask approval if decision is material
→ implement only requested scope
→ run checks/tests
→ report
→ STOP
```

## Before coding
Claude must:
- identify the active phase in `docs/13_DEVELOPMENT_PLAN.md`;
- inspect relevant existing files;
- avoid assuming the repository is empty;
- identify whether the request changes schema, permissions or lifecycle;
- check if the task conflicts with documented requirements.

## Ambiguity protocol
If a decision materially affects data integrity, privacy, authorization, dates, loan status, automation delivery or deployment, stop and report:

```text
I found an ambiguity.

Requirement:
Current documentation:
Current code:
Impact:
Options:
Recommendation:
Please confirm before implementation.
```

Do not silently invent a policy.

## Scope control
- Do not rewrite unrelated files.
- Do not rename established components without need.
- Do not update all dependencies opportunistically.
- Do not change visual design while implementing backend behavior.
- Do not implement future phases.
- Do not introduce a new library when native stack capabilities are sufficient.

## After implementation
Report:
1. Summary of behavior implemented.
2. Files changed.
3. Convex schema/functions changed.
4. Dependencies changed.
5. Tests/checks executed and results.
6. Manual verification still required.
7. Security/permission implications.
8. Known limitations.
9. Suggested next phase.

Then STOP. Do not start the next phase automatically.
