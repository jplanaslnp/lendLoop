import type { Metadata } from "next";

import { LoansScreen } from "@/features/loans/LoansScreen";

export const metadata: Metadata = {
  title: "Borrowing",
};

export default function BorrowingPage() {
  return <LoansScreen role="sent" />;
}
