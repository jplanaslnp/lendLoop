export const ROUTES = {
  explore: "/explore",
  borrowing: "/borrowing",
  lending: "/lending",
  share: "/share",
  profile: "/profile",
  tool: (id: string) => `/tools/${id}`,
  editListing: (id: string) => `/share/${id}`,
  user: (id: string) => `/users/${id}`,
} as const;

export type NavKey = "explore" | "borrowing" | "lending" | "share" | "profile";

/** Pages that require sign-in (UI gate only; enforced server-side later). */
export const PROTECTED_NAV: readonly NavKey[] = [
  "borrowing",
  "lending",
  "share",
  "profile",
];
