"use client";

import Link from "next/link";

import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { AvailabilityOverlayBadge } from "@/components/ui/StatusBadge";
import { ToolImage } from "@/components/ui/ToolImage";
import { getCategory, getConditionLabel } from "@/config/categories";
import { ROUTES } from "@/config/navigation";
import {
  areaName,
  ownerOf,
  toToolPhotos,
  type ListingCard,
} from "@/features/listings/types";
import { cn } from "@/lib/cn";

/**
 * Listing card (Explore grid and "Similar items nearby"). Convex sends the
 * owner only to signed-in members; everyone else sees category + condition.
 */
const SIZES = {
  explore: {
    body: "p-3 md:px-5 md:py-[18px]",
    title: "text-[15.5px] md:text-xl",
    desc: "text-[13px] md:text-[15px]",
    meta: "text-[12.5px] md:text-[15px]",
    divider: "my-2.5 md:my-4",
    avatar: "size-6 md:size-[30px]",
    badge: "h-[26px] text-xs md:h-8 md:text-sm",
  },
  similar: {
    body: "p-3 md:px-5 md:py-[18px]",
    title: "text-[15.5px] md:text-[19px]",
    desc: "text-[13px] md:text-[14.5px]",
    meta: "text-[12.5px] md:text-[14.5px]",
    divider: "my-2.5 md:my-3.5",
    avatar: "size-6 md:size-7",
    badge: "h-[26px] text-xs md:h-[30px] md:text-[13.5px]",
  },
} as const;

export function ToolCard({
  tool,
  size = "explore",
  priority,
}: {
  tool: ListingCard;
  size?: keyof typeof SIZES;
  priority?: boolean;
}) {
  const s = SIZES[size];
  const owner = ownerOf(tool);

  return (
    <Link
      href={ROUTES.tool(tool.id)}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-solid border-[rgba(47,70,54,.07)] bg-surface text-forest shadow-card transition-[transform,box-shadow] duration-[250ms] ease-in-out hover:-translate-y-[3px] hover:text-forest hover:shadow-card-hover md:rounded-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-image">
        <ToolImage
          photo={toToolPhotos(tool.photos)[0]}
          alt={tool.name}
          sizes="(min-width: 1100px) 25vw, (min-width: 760px) 33vw, 50vw"
          priority={priority}
        />
        <AvailabilityOverlayBadge
          availability={tool.availability}
          blur={size === "explore"}
          className={cn(
            "top-2.5 left-2.5 md:top-3 md:right-3 md:left-auto",
            s.badge,
          )}
        />
      </div>
      <div className={cn("flex flex-1 flex-col", s.body)}>
        <h3
          className={cn(
            "m-0 leading-[1.25] font-bold tracking-tight text-forest",
            s.title,
          )}
        >
          {tool.name}
        </h3>
        <p
          className={cn(
            "mt-1.5 mb-0 line-clamp-2 min-h-[2.9em] leading-[1.45] text-ink-soft",
            s.desc,
          )}
        >
          {tool.description}
        </p>
        <div className={cn("h-px bg-[rgba(47,70,54,.1)]", s.divider)} />
        {owner ? (
          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "relative flex-none overflow-hidden rounded-full",
                  s.avatar,
                )}
              >
                <PersonAvatar
                  name={owner.displayName}
                  imageUrl={owner.imageUrl}
                  size={30}
                  fluid
                />
              </span>
              <span className={cn("truncate font-medium text-forest", s.meta)}>
                {owner.displayName}
              </span>
            </div>
            <span
              className={cn(
                "flex flex-none items-center gap-1.5 font-semibold text-forest",
                s.meta,
              )}
            >
              <span className="size-1 rounded-full bg-forest" aria-hidden />
              {areaName(tool.locationLabel)}
            </span>
          </div>
        ) : (
          <div className="mt-auto flex items-center justify-between gap-2">
            <span className={cn("truncate font-medium text-ink-soft", s.meta)}>
              {getCategory(tool.category).label}
            </span>
            <span className={cn("flex-none font-semibold text-forest", s.meta)}>
              {getConditionLabel(tool.condition)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
