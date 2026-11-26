# 08 — Design and UI

## Source of truth
The approved Claude Design screens and exported design/code are the primary visual reference. Preserve their layout, component hierarchy, spacing and responsive behaviour unless a specific product requirement requires a change.

## Branding
Final name: **LendLoop**.
Tagline: **“Borrow what you need. Lend what you don’t.”**

Earlier visual concepts use “Share your tool”. Replace only the brand name/logo/tagline with LendLoop branding; do not use this as an excuse to redesign the interface.

## Visual direction
The approved direction is clean, minimal, friendly and community-oriented:
- Sage background: `#E8F0E2`
- Warm white surfaces: `#FAFBF8`
- Forest green typography: `#2F4636`
- Purple primary action: `#7040A0`
- Lavender highlight: `#E9DDF5`
- Muted sage accent: `#D5E3CF`

Use the actual exported design tokens if available; this palette is a reference and must not override a more recent approved token file.

## Responsive layouts
- Desktop and mobile are both first-class web layouts.
- Explore desktop uses a multi-column grid; mobile uses a two-column grid where appropriate.
- Product image ratio and card structure should follow approved designs.
- Mobile bottom navigation is shown only on authenticated application pages where already designed.
- Product details mobile view uses its approved header and fixed Request to borrow action; do not add a conflicting bottom nav.
- Authentication is a modal overlay, not a standalone page, unless a later explicit decision changes this.
- Auth modal on mobile may become near-fullscreen/fullscreen and scroll internally.

## Core screens
- Public Explore (logged-out read-only).
- Auth modal: Sign in / Create account.
- Authenticated Explore / all tools with category filters.
- Product details.
- Borrowing / My requests.
- Lending / Incoming requests.
- Share a Tool / create listing.
- My Profile.
- Public Profile (read-only).
- Admin experience for listings, all loans and Trusted Lender management.

Admin screens are not fully designed yet. Implement a restrained, consistent admin interface using existing components; do not redesign the consumer experience.

## Public vs authenticated UI
Logged-out Explore:
- show tool name and category only in the public list;
- no owner name, avatar, building, floor, address or personal details;
- Sign in to lend or borrow CTA.
Authenticated UI can show additional information only where needed for the borrowing relationship.

## Footer
Use the approved desktop footer concept on public-facing pages. Keep account-management pages free of a large footer. On mobile, footer must not overlap fixed navigation.

## Accessibility
- Semantic headings and buttons.
- Keyboard-accessible modal with focus management.
- Escape closes modal; focus returns to triggering element.
- Clear labels and validation messages.
- Visible focus states and sufficient contrast.
- Do not rely on color alone for loan status.
