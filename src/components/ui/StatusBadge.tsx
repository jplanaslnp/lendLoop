import type { CSSProperties } from "react";

import {
  AVAILABILITY_STYLES,
  LOAN_STATUS_STYLES,
  type Availability,
} from "@/config/loanStatus";
import { cn } from "@/lib/cn";
import type { LoanStatus } from "@/mocks/requests";

import { Icon } from "./Icon";

/** Availability badge overlaid on listing images (Available / Borrowed). */
export function AvailabilityOverlayBadge({
  availability,
  className,
  blur = true,
}: {
  availability: Availability;
  className?: string;
  /** Explore cards blur the photo behind the badge; previews do not. */
  blur?: boolean;
}) {
  const s = AVAILABILITY_STYLES[availability];
  return (
    <span
      className={cn(
        "pointer-events-none absolute flex items-center gap-[7px] rounded-full px-3 font-semibold shadow-badge",
        blur && "backdrop-blur-[6px]",
        className,
      )}
      style={{ background: s.overlayBg, color: s.fg }}
    >
      <span
        className="size-2 rounded-full"
        style={{ background: s.dot }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}

/** Solid availability pill (product page, profile rows, owner lists). */
export function AvailabilityPill({
  availability,
  className,
  dotClassName = "size-[7px]",
}: {
  availability: Availability;
  className?: string;
  dotClassName?: string;
}) {
  const s = AVAILABILITY_STYLES[availability];
  return (
    <span
      className={cn(
        "flex items-center rounded-full font-bold whitespace-nowrap",
        className,
      )}
      style={{ background: s.pillBg, color: s.fg }}
    >
      <span
        className={cn("flex-none rounded-full", dotClassName)}
        style={{ background: s.dot }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}

/** Loan/request status badge with icon (Borrowing, Lending, histories). */
export function LoanStatusBadge({
  status,
  className,
  iconSize = 16,
  iconStrokeWidth = 2.1,
  labelOverride,
  style,
}: {
  status: LoanStatus;
  className?: string;
  iconSize?: number;
  iconStrokeWidth?: number;
  labelOverride?: string;
  style?: CSSProperties;
}) {
  const s = LOAN_STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "flex items-center rounded-full whitespace-nowrap",
        className,
      )}
      style={{ background: s.bg, color: s.fg, ...style }}
    >
      <Icon
        name={s.icon}
        size={iconSize}
        strokeWidth={iconStrokeWidth}
        className="flex-none"
      />
      {labelOverride ?? s.label}
    </span>
  );
}
