import type { Metadata } from "next";

import { ShareToolScreen } from "@/features/share/ShareToolScreen";

export const metadata: Metadata = {
  title: "Share a tool",
};

/**
 * Account page behind the Clerk gate in proxy.ts. Next's dev-time instant
 * check renders it without the visitor's session, so the gate redirects and
 * validation can't run; opt out rather than weaken the gate.
 */
export const instant = false;

export default function SharePage() {
  return <ShareToolScreen />;
}
