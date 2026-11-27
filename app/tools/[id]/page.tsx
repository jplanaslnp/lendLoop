import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ProductDetailsLoader } from "@/features/tools/ProductDetailsLoader";
import { api } from "@convex/_generated/api";

/**
 * Product details from Convex. The server lookup is anonymous (public
 * fields only) and is used for the title and a real 404; the client then
 * subscribes with the visitor's session, so members also get owner details.
 * Rendered per request (no approved loading design for this page yet).
 */
export const instant = false;

/** Live Convex lookup at request time (the Convex client is not prerenderable). */
async function getListing(id: string) {
  await connection();
  return fetchQuery(api.listings.get, { id });
}

export async function generateMetadata({
  params,
}: PageProps<"/tools/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  return { title: listing ? listing.name : "Tool not found" };
}

export default async function ToolPage({ params }: PageProps<"/tools/[id]">) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  return <ProductDetailsLoader routeId={id} initial={listing} />;
}
