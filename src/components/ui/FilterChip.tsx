import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon, type IconName } from "./Icon";

type FilterChipProps = {
  label: string;
  icon: IconName;
  iconStrokeWidth?: number;
  active: boolean;
  onSelect: () => void;
  /** Height classes differ per screen (Explore 44/48px, requests 44/46px). */
  className?: string;
};

/** Pill filter chip used for Explore categories and request status filters. */
export function FilterChip({
  label,
  icon,
  iconStrokeWidth = 1.7,
  active,
  onSelect,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex flex-none items-center gap-2 rounded-full border border-solid px-[18px] text-sm whitespace-nowrap transition-[background] duration-150",
        active
          ? "border-primary bg-primary font-semibold text-white shadow-chip-active"
          : "border-[rgba(47,70,54,.08)] bg-surface font-medium text-forest shadow-chip",
        className,
      )}
    >
      <Icon name={icon} size={18} strokeWidth={iconStrokeWidth} />
      {label}
    </button>
  );
}

/** Horizontally scrolling chip row (edge-to-edge on mobile). */
export function ChipRow({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-mx-4 my-[18px] no-scrollbar flex gap-2.5 overflow-x-auto px-4 py-0.5 md:mx-0 md:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
