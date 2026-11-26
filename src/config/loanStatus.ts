import type { IconName } from "@/components/ui/Icon";
import type { LoanStatus } from "@/mocks/requests";

/**
 * Loan/request status presentation (design tokens). Every status has a text
 * label and an icon, so status never relies on colour alone.
 */
export type StatusStyle = {
  label: string;
  bg: string;
  fg: string;
  icon: IconName;
};

export const LOAN_STATUS_STYLES: Record<LoanStatus, StatusStyle> = {
  pending: { label: "Pending", bg: "#FFF4CC", fg: "#8A6100", icon: "clock" },
  approved: { label: "Approved", bg: "#E1F0DA", fg: "#2C6B34", icon: "check" },
  ready: {
    label: "Ready for Pickup",
    bg: "#FFE48A",
    fg: "#6B4A00",
    icon: "box",
  },
  borrowed: { label: "Borrowed", bg: "#E9DDF5", fg: "#5A2D8C", icon: "swap" },
  overdue: { label: "Overdue", bg: "#FCE1DD", fg: "#B3261E", icon: "alert" },
  returnPending: {
    label: "Return Pending",
    bg: "#F1EAF9",
    fg: "#7040A0",
    icon: "hourglass",
  },
  returned: {
    label: "Returned",
    bg: "#E9DDF5",
    fg: "#7040A0",
    icon: "returnArrow",
  },
  declined: { label: "Declined", bg: "#FDE3E1", fg: "#C62828", icon: "x" },
  cancelled: { label: "Cancelled", bg: "#E4E9E1", fg: "#56655B", icon: "ban" },
};

/** Availability badge used on listing cards. */
export const AVAILABILITY_STYLES = {
  available: {
    label: "Available",
    overlayBg: "rgba(250,251,248,.94)",
    pillBg: "#E1F0DA",
    fg: "#1F5A2C",
    dot: "#2EA44F",
  },
  borrowed: {
    label: "Borrowed",
    overlayBg: "rgba(255,246,214,.96)",
    pillBg: "#FFF4CC",
    fg: "#7A5800",
    dot: "#EDB800",
  },
} as const;

export type Availability = keyof typeof AVAILABILITY_STYLES;
