import type { Metadata } from "next";

import { LoansScreen } from "@/features/loans/LoansScreen";

export const metadata: Metadata = {
  title: "Lending",
};

export default function LendingPage() {
  return <LoansScreen role="received" />;
}
