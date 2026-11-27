"use client";

import { useQuery } from "convex/react";
import { useState } from "react";

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import {
  DesktopHeader,
  MobileBrandHeader,
} from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ToolCard } from "@/components/listings/ToolCard";
import { ToolCardSkeleton } from "@/components/listings/ToolCardSkeleton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChipRow, FilterChip } from "@/components/ui/FilterChip";
import { QueryErrorBoundary } from "@/components/ui/QueryErrorBoundary";
import {
  EXPLORE_FILTER_CATEGORIES,
  getCategory,
  type CategoryId,
} from "@/config/categories";
import type { ListingCard } from "@/features/listings/types";
import { api } from "@convex/_generated/api";

type Filter = "all" | CategoryId;

const PANEL = "rounded-[20px] bg-surface px-6 py-[72px]";
const GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4";

/**
 * Explore — public (read-only) and signed-in browsing of Convex listings.
 * What each visitor may see is decided by `listings.list` in Convex.
 */
export function ExploreScreen() {
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <div className="min-h-screen bg-sage pb-24 md:pb-16">
      <DesktopHeader active="explore" />
      <MobileBrandHeader />

      <main className="mx-auto max-w-[1440px] px-4 pt-[22px] md:px-8 md:pt-9 xl:px-14">
        <h1 className="m-0 text-[34px] leading-[1.05] font-extrabold tracking-tightest text-forest md:text-[44px]">
          Explore
        </h1>
        <p className="mt-2.5 mb-0 text-[15px] leading-[1.45] text-pretty text-ink-muted md:text-[17px]">
          Discover tools and items shared by your neighbours.
        </p>

        <ChipRow
          label="Filter by category"
          className="md:mt-[26px] md:mb-[30px]"
        >
          <FilterChip
            label="All Items"
            icon="grid"
            active={filter === "all"}
            onSelect={() => setFilter("all")}
            className="h-11 md:h-12"
          />
          {EXPLORE_FILTER_CATEGORIES.map((id) => {
            const c = getCategory(id);
            return (
              <FilterChip
                key={id}
                label={c.label}
                icon={c.icon}
                active={filter === id}
                onSelect={() => setFilter(id)}
                className="h-11 md:h-12"
              />
            );
          })}
        </ChipRow>

        <QueryErrorBoundary fallback={(retry) => <LoadError retry={retry} />}>
          <ExploreResults filter={filter} />
        </QueryErrorBoundary>
      </main>

      <SiteFooter />
      <MobileBottomNav active="explore" />
    </div>
  );
}

function ExploreResults({ filter }: { filter: Filter }) {
  const tools = useQuery(
    api.listings.list,
    filter === "all" ? {} : { category: filter },
  );

  if (tools === undefined) {
    return (
      <div className={GRID} role="status" aria-label="Loading tools">
        {Array.from({ length: 8 }, (_, i) => (
          <ToolCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <EmptyState
        title="Nothing shared here yet"
        description={
          filter === "all"
            ? "Be the first neighbour to share something."
            : "Be the first neighbour to share something in this category."
        }
        className={PANEL}
      />
    );
  }

  return (
    <div className={GRID}>
      {tools.map((tool: ListingCard, i) => (
        <ToolCard key={tool.id} tool={tool} priority={i < 4} />
      ))}
    </div>
  );
}

function LoadError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className={`${PANEL} flex flex-col items-center gap-4`}>
      <EmptyState
        title="We couldn’t load the tools"
        description="Check your connection and try again."
        className="border-none p-0"
      />
      <Button
        variant="outline"
        onClick={retry}
        className="min-h-[46px] px-6 text-[15px] font-bold"
      >
        Try again
      </Button>
    </div>
  );
}
