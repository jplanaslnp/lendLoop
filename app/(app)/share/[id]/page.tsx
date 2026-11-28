import type { Metadata } from "next";

import { EditListingScreen } from "@/features/share/EditListingScreen";

export const metadata: Metadata = {
  title: "Edit listing",
};

/**
 * Account page behind the Clerk gate in proxy.ts (see ../page.tsx). Only
 * the owner of an active listing gets its data (`myListings.getForEdit`).
 */
export const instant = false;

export default async function EditListingPage({
  params,
}: PageProps<"/share/[id]">) {
  const { id } = await params;
  return <EditListingScreen listingId={id} />;
}
