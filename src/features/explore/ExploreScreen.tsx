"use client";

import { useState } from "react";

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import {
  DesktopHeader,
  MobileBrandHeader,
} from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ToolCard } from "@/components/listings/ToolCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChipRow, FilterChip } from "@/components/ui/FilterChip";
import {
  EXPLORE_FILTER_CATEGORIES,
  getCategory,
  type CategoryId,
} from "@/config/categories";
import { getExploreTools } from "@/mocks/tools";

type Filter = "all" | CategoryId;

/** Explore — public (read-only) and signed-in tool browsing (mock data). */
export function ExploreScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const tools = getExploreTools().filter(
    (t) => filter === "all" || t.category === filter,
  );

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

        {tools.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
            {tools.map((tool, i) => (
              <ToolCard key={tool.id} tool={tool} priority={i < 4} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing shared here yet"
            description="Be the first neighbour to share something in this category."
            className="rounded-[20px] bg-surface px-6 py-[72px]"
          />
        )}
      </main>

      <SiteFooter />
      <MobileBottomNav active="explore" />
    </div>
  );
}
