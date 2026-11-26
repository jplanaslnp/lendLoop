import { redirect } from "next/navigation";

import { ROUTES } from "@/config/navigation";

/** The public Explore page is the LendLoop home. */
export default function HomePage() {
  redirect(ROUTES.explore);
}
