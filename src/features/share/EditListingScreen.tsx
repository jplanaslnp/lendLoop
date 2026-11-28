"use client";

import { useConvexAuth, useQuery } from "convex/react";

import {
  DesktopHeader,
  MobileBrandHeader,
} from "@/components/layout/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/config/navigation";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { api } from "@convex/_generated/api";

import { ShareToolScreen } from "./ShareToolScreen";

/**
 * Loads the caller's own listing for editing. Convex returns null for
 * anything else (another user's, archived, unknown), shown as not found.
 */
export function EditListingScreen({ listingId }: { listingId: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const listing = useQuery(
    api.myListings.getForEdit,
    isAuthenticated ? { id: listingId } : "skip",
  );

  if (listing) return <ShareToolScreen key={listing.id} editing={listing} />;

  const loading = isLoading || !isAuthenticated || listing === undefined;
  return (
    <div className="min-h-screen bg-sage pb-24 md:pb-16">
      <DesktopHeader />
      <MobileBrandHeader />
      <RequireAuth>
        <main className="mx-auto max-w-[760px] px-4 pt-16">
          {loading ? (
            <p role="status" className="text-center text-ink-soft">
              Loading your listing…
            </p>
          ) : (
            <div role="alert" className="flex flex-col items-center gap-6">
              <EmptyState
                title="This listing can’t be edited"
                description="It doesn’t exist, was removed, or belongs to someone else."
                className="w-full rounded-[20px] bg-surface px-6 py-[72px]"
              />
              <ButtonLink
                href={ROUTES.profile}
                variant="neutral"
                className="min-h-[50px] px-7 text-base font-semibold"
              >
                Back to your profile
              </ButtonLink>
            </div>
          )}
        </main>
      </RequireAuth>
    </div>
  );
}
