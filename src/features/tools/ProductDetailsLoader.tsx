"use client";

import { useQuery } from "convex/react";
import Link from "next/link";

import { DesktopHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/config/navigation";
import type { ListingDetail } from "@/features/listings/types";
import { api } from "@convex/_generated/api";

import { ProductDetailsScreen } from "./ProductDetailsScreen";

/**
 * Live product data. Shows the server's public snapshot until the client
 * subscription answers (with owner details for members), and a not-found
 * state if the listing disappears while the page is open.
 */
export function ProductDetailsLoader({
  routeId,
  initial,
}: {
  routeId: string;
  initial: ListingDetail;
}) {
  const live = useQuery(api.listings.get, { id: routeId });
  if (live === null) return <ListingGone />;
  return <ProductDetailsScreen routeId={routeId} tool={live ?? initial} />;
}

function ListingGone() {
  return (
    <div className="min-h-screen bg-sage pb-16">
      <DesktopHeader active="explore" />
      <main className="mx-auto max-w-[760px] px-4 pt-16">
        <div role="alert">
          <EmptyState
            title="This tool is no longer available"
            description="It may have been removed by its owner."
            className="rounded-[20px] bg-surface px-6 py-[72px]"
          />
        </div>
        <p className="mt-6 text-center">
          <Link href={ROUTES.explore} className="font-bold">
            Back to Explore
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
