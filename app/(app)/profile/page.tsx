import type { Metadata } from "next";

import { MyProfileScreen } from "@/features/profiles/MyProfileScreen";

export const metadata: Metadata = {
  title: "My Profile",
};

/**
 * Account page behind the Clerk gate in proxy.ts. Next's dev-time instant
 * check renders it without the visitor's session, so the gate redirects and
 * validation can't run; opt out rather than weaken the gate.
 */
export const instant = false;

export default function MyProfilePage() {
  return <MyProfileScreen />;
}
