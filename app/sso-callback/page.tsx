import type { Metadata } from "next";

import { SsoCallback } from "@/features/auth/SsoCallback";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false },
};

/** Google OAuth returns here; Clerk finishes the sign-in, then continues. */
export default function SsoCallbackPage() {
  return <SsoCallback />;
}
