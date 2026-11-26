# 09 — Project Structure

Recommended Next.js App Router structure. Adapt only when the existing repository has an established equivalent.

```text
LENDLOOP/
├── CLAUDE.md
├── README.md
├── docs/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (public)/
│   │   └── explore/
│   ├── (app)/
│   │   ├── borrowing/
│   │   ├── lending/
│   │   ├── share/
│   │   └── profile/
│   ├── tools/
│   │   └── [id]/
│   └── admin/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── listings/
│   │   ├── borrowing/
│   │   ├── lending/
│   │   └── auth/
│   ├── features/
│   │   ├── auth/
│   │   ├── listings/
│   │   ├── borrowing/
│   │   ├── lending/
│   │   ├── profiles/
│   │   ├── admin/
│   │   └── automation/
│   ├── lib/
│   │   ├── convex/
│   │   ├── clerk/
│   │   ├── validation/
│   │   └── utils/
│   ├── domain/
│   │   ├── listings/
│   │   ├── loans/
│   │   └── permissions/
│   ├── hooks/
│   ├── types/
│   └── config/
├── convex/
│   ├── schema.ts
│   ├── auth.config.ts
│   ├── users.ts
│   ├── listings.ts
│   ├── borrowRequests.ts
│   ├── admin.ts
│   ├── automation.ts
│   ├── http.ts
│   └── _generated/
├── n8n/
│   ├── workflows/
│   └── README.md
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
└── .env.example
```

## Rules
- Keep `app/` route files thin.
- UI components must not contain raw authorization logic.
- Convex functions are the only application backend entry point for canonical data.
- Keep domain rules testable and separate from presentation.
- Feature folders own their feature-specific hooks/components.
- Keep shared UI components generic.
- Do not add abstractions before there is a real use case.
- Do not commit generated secrets or local `.env` files.
