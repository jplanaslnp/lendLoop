# 07 — Authentication and Role-Based Access Control

## Authentication provider
Use Clerk for sign-up, sign-in, sign-out, session management and identity.

Integrate Clerk with Convex using the official Clerk/Convex integration. Configure Convex JWT issuer/audience settings as required by the current official documentation.

## User provisioning
- Clerk user ID (`sub`) is the external identity key.
- On first authenticated application use, create or upsert the corresponding Convex `users` profile through a trusted backend function.
- Do not accept a caller-supplied Clerk ID as the identity of the current user.
- Derive identity from `ctx.auth.getUserIdentity()`.
- If identity is missing or invalid, deny access to authenticated operations.

## Roles
`user` and `admin`.

Default new accounts to `user`. Never allow a user to pass `role: "admin"` through a public mutation.

Admin assignment must happen through a controlled operator-only process (e.g. Convex dashboard/manual bootstrap for the initial admin, followed by a protected admin function). Record role changes if role management is added.

## Permission matrix

| Action | Public | User (owner) | User (borrower) | Admin |
|---|---:|---:|---:|---:|
| Read public listing name/category | Yes | Yes | Yes | Yes |
| Read private listing details | No* | Yes | Yes** | Yes |
| Create listing | No | Yes | Yes | Yes |
| Edit listing | No | Own only | Own only | Not required by brief |
| Delete own listing | No | Own only | Own only | Yes |
| Remove any listing | No | No | No | Yes |
| Create borrow request | No | If borrowing another's listing | Yes | Not an admin shortcut |
| Approve/decline request | No | Own listing only | No | View all; no implicit impersonation |
| View own requests/loans | No | Relevant records only | Relevant records only | Yes, all |
| Mark Trusted Lender | No | No | No | Yes |

*The public page must not return owner details. Authenticated detail visibility can follow the approved product design and privacy rules.
**Borrower can see only the owner information needed for an active/requested transaction, according to the approved privacy policy.

## Convex enforcement
Every public query/mutation/action that accesses private data must:
1. Authenticate using Convex identity.
2. Resolve the corresponding user profile.
3. Check role and record ownership/relationship.
4. Validate requested state transition.
5. Return only fields the caller is allowed to see.

Do not rely on:
- hidden buttons;
- client route protection alone;
- Clerk UI state alone;
- client-supplied `userId`, `ownerId`, `borrowerId` or role.

## Public data minimization
Create a dedicated public query returning only:
- listing ID (only if required to navigate);
- name;
- category.

Do not return owner ID, email, address, floor, profile image or other owner details to logged-out clients.

## Trusted Lender
- `isTrustedLender` is an admin-controlled flag.
- Only admin can grant or revoke it.
- Both actions must create an audit record.
- Do not let a user set their own badge.
- Badge is a trust signal, not a guarantee or a new permission level.

## Admin access
Admin queries must verify role server-side. Admin endpoints must not expose secrets or unnecessary user data. Admin actions should be explicit and audited.
