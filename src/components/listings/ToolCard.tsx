"use client";

import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { AvailabilityOverlayBadge } from "@/components/ui/StatusBadge";
import { ToolImage } from "@/components/ui/ToolImage";
import { getCategory, getConditionLabel } from "@/config/categories";
import { ROUTES } from "@/config/navigation";
import { useAuthUi } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { avatarSrc, PEOPLE } from "@/mocks/people";
import type { MockTool } from "@/mocks/tools";

/**
 * Listing card (Explore grid and "Similar items nearby").
 * Signed-out visitors see category + condition instead of owner details.
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
  tool: MockTool;
  size?: keyof typeof SIZES;
  priority?: boolean;
}) {
  const { isSignedIn } = useAuthUi();
  const s = SIZES[size];
  const owner = PEOPLE[tool.ownerId];

  return (
    <Link
      href={ROUTES.tool(tool.id)}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-solid border-[rgba(47,70,54,.07)] bg-surface text-forest shadow-card transition-[transform,box-shadow] duration-[250ms] ease-in-out hover:-translate-y-[3px] hover:text-forest hover:shadow-card-hover md:rounded-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-image">
        <ToolImage
          photo={tool.photos[0]}
          alt={tool.name}
          sizes="(min-width: 1100px) 25vw, (min-width: 760px) 33vw, 50vw"
          priority={priority}
        />
        <AvailabilityOverlayBadge
          availability={tool.available ? "available" : "borrowed"}
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
        {isSignedIn ? (
          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "relative flex-none overflow-hidden rounded-full",
                  s.avatar,
                )}
              >
                <Avatar src={avatarSrc(owner.id)} alt="" size={30} fluid />
              </span>
              <span className={cn("truncate font-medium text-forest", s.meta)}>
                {owner.shortName}
              </span>
            </div>
            <span
              className={cn(
                "flex flex-none items-center gap-1.5 font-semibold text-forest",
                s.meta,
              )}
            >
              <span className="size-1 rounded-full bg-forest" aria-hidden />
              {owner.building}
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
