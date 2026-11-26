import type { Metadata } from "next";

import { ShareToolScreen } from "@/features/share/ShareToolScreen";

export const metadata: Metadata = {
  title: "Share a tool",
};

export default function SharePage() {
  return <ShareToolScreen />;
}
