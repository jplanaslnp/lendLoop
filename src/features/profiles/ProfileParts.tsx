import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import {
  AvailabilityOverlayBadge,
  AvailabilityPill,
  LoanStatusBadge,
} from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import type { LoanStatus } from "@/mocks/requests";

/** Shared building blocks for My Profile and the public User Profile. */

export const PROFILE_CARD =
  "rounded-panel border border-solid border-[rgba(47,70,54,.07)] bg-surface px-4 py-[18px] shadow-panel md:px-8 md:py-7";

export function SectionHeading({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-start justify-between gap-4 md:mb-6">
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <div className="flex size-10 flex-none items-center justify-center rounded-field bg-lavender text-primary md:size-12">
            <Icon name={icon} size={22} />
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="m-0 text-[21px] leading-[1.15] font-extrabold tracking-tighter text-forest md:text-[28px]">
            {title}
          </h2>
          <p className="mt-1.5 mb-0 text-sm leading-[1.45] text-pretty text-ink-muted md:text-base">
            {subtitle}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function ProfileMeta({
  icon,
  children,
}: {
  icon: "building" | "calendar";
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-2.5 text-sm text-forest md:text-base">
      <Icon name={icon} size={20} strokeWidth={1.6} className="flex-none" />
      <span>{children}</span>
    </span>
  );
}

/** Desktop item tile (image with availability badge, name, category). */
export function ItemTile({
  image,
  name,
  categoryLabel,
  available,
  children,
}: {
  image: string;
  name: string;
  categoryLabel: string;
  available: boolean;
  /** Footer extras (e.g. the actions menu button). */
  children?: ReactNode;
}) {
  return (
    <>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-t-card bg-image bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      >
        <AvailabilityOverlayBadge
          availability={available ? "available" : "borrowed"}
          blur={false}
          className="top-3 left-3 h-[30px] text-[13.5px]"
        />
      </div>
      <div className="flex items-center justify-between gap-2.5 py-4 pr-3 pl-5">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-[19px] leading-[1.25] font-bold tracking-tight text-forest">
            {name}
          </h3>
          <div className="mt-[3px] text-[14.5px] text-ink-soft">
            {categoryLabel}
          </div>
        </div>
        {children}
      </div>
    </>
  );
}

/** Mobile item row (thumbnail, name, category, availability pill). */
export function ItemRowContent({
  image,
  name,
  categoryLabel,
  available,
}: {
  image: string;
  name: string;
  categoryLabel: string;
  available: boolean;
}) {
  return (
    <>
      <div
        className="aspect-[4/3] w-[72px] rounded-[10px] bg-image bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="min-w-0">
        <div className="truncate text-[15px] font-bold text-forest">{name}</div>
        <div className="mt-0.5 truncate text-[13px] text-ink-soft">
          {categoryLabel}
        </div>
      </div>
      <AvailabilityPill
        availability={available ? "available" : "borrowed"}
        className="h-[26px] gap-1.5 px-2.5 text-xs"
      />
    </>
  );
}

export type HistoryListRow = {
  key: string;
  name: string;
  image: string;
  meta: string;
  status: LoanStatus;
  statusLabel?: string;
  dates?: string;
};

/**
 * Bordered list of loan rows. With `href` the rows are links and show a
 * date column + chevron (My Profile); without, they are static (User Profile).
 */
export function HistoryList({
  rows,
  href,
}: {
  rows: readonly HistoryListRow[];
  href?: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-solid border-[rgba(47,70,54,.08)] bg-white">
      {rows.map((row, i) => {
        const content = (
          <>
            <div
              className="aspect-[4/3] w-full rounded-[10px] bg-image bg-cover bg-center"
              style={{ backgroundImage: `url(${row.image})` }}
            />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold text-forest md:text-[17px]">
                {row.name}
              </div>
              <div className="mt-0.5 truncate text-[13px] text-ink-soft md:text-[15px]">
                {row.meta}
                {href && row.dates ? (
                  <span className="md:hidden"> · {row.dates}</span>
                ) : null}
              </div>
            </div>
            <div className="flex justify-start">
              <LoanStatusBadge
                status={row.status}
                labelOverride={row.statusLabel}
                iconSize={13}
                className="h-[26px] gap-1.5 px-3 text-xs font-bold md:h-8 md:text-sm md:[&>svg]:size-4"
              />
            </div>
            {href ? (
              <>
                <span className="hidden text-[15px] whitespace-nowrap text-ink-link md:inline">
                  {row.dates}
                </span>
                <Icon
                  name="chevronRight"
                  size={20}
                  className="justify-self-end text-forest"
                />
              </>
            ) : null}
          </>
        );
        const rowClass = cn(
          "grid items-center gap-3 px-3 py-2.5 md:gap-5 md:py-3 md:pr-5 md:pl-3",
          href
            ? "grid-cols-[64px_minmax(0,1fr)_auto_18px] text-forest transition-[background] duration-150 hover:bg-[#F7F3FB] hover:text-forest md:grid-cols-[96px_minmax(0,1fr)_190px_160px_24px]"
            : "grid-cols-[64px_minmax(0,1fr)_auto] md:grid-cols-[96px_minmax(0,1fr)_auto]",
          i > 0 && "border-t border-solid border-[rgba(47,70,54,.08)]",
        );
        return href ? (
          <Link key={row.key} href={href} className={rowClass}>
            {content}
          </Link>
        ) : (
          <div key={row.key} className={rowClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
