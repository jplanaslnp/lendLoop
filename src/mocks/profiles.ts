import type { LoanStatus } from "./requests";
import type { PersonId } from "./people";

/** Phase 2 mock profile content, copied from My Profile / User Profile. */

export type HistoryRow = {
  name: string;
  image: string;
  who: string;
  status: LoanStatus;
  dates: string;
};

export const LENDING_HISTORY: readonly (HistoryRow & { itemId: string })[] = [
  {
    itemId: "drill",
    name: "Cordless drill",
    image: "drill",
    who: "David R.",
    status: "borrowed",
    dates: "Nov 18 – Nov 30",
  },
  {
    itemId: "bike",
    name: "City bike",
    image: "bike",
    who: "Ruben G.",
    status: "overdue",
    dates: "Nov 19 – Nov 23",
  },
  {
    itemId: "chair",
    name: "Camping chair",
    image: "chair",
    who: "Laura P.",
    status: "approved",
    dates: "Dec 5 – Dec 7",
  },
  {
    itemId: "projector",
    name: "Projector",
    image: "projector",
    who: "Marc S.",
    status: "returned",
    dates: "Oct 10 – Oct 14",
  },
  {
    itemId: "blender",
    name: "Blender",
    image: "blender",
    who: "Emma L.",
    status: "cancelled",
    dates: "Sep 2 – Sep 5",
  },
];

export const BORROWING_HISTORY: readonly HistoryRow[] = [
  {
    name: "Cooler Box",
    image: "cooler",
    who: "Emma L.",
    status: "ready",
    dates: "Nov 26 – Nov 29",
  },
  {
    name: "Camera Tripod",
    image: "tripod",
    who: "Ruben G.",
    status: "borrowed",
    dates: "Nov 20 – Dec 2",
  },
  {
    name: "Softbox Kit",
    image: "softbox",
    who: "Trevis K.",
    status: "returnPending",
    dates: "Nov 15 – Nov 22",
  },
  {
    name: "Angle Grinder",
    image: "grinder",
    who: "Bruno M.",
    status: "returned",
    dates: "Nov 5 – Nov 8",
  },
  {
    name: "Drone",
    image: "drone",
    who: "Sara T.",
    status: "cancelled",
    dates: "Nov 1 – Nov 3",
  },
];

export type PublicProfile = {
  items: readonly {
    toolId: string;
    name: string;
    categoryLabel: string;
    image: string;
    available: boolean;
  }[];
  activity: readonly {
    name: string;
    image: string;
    when: string;
    status: "returned" | "borrowed";
  }[];
};

export const PUBLIC_PROFILES: Record<PersonId, PublicProfile> = {
  marc: {
    items: [
      {
        toolId: "projector",
        name: "Projector",
        categoryLabel: "Electronics",
        image: "projector",
        available: true,
      },
    ],
    activity: [
      {
        name: "Projector",
        image: "projector",
        when: "Oct 2026",
        status: "returned",
      },
      {
        name: "Projector",
        image: "projector",
        when: "Aug 2026",
        status: "returned",
      },
    ],
  },
  laura: {
    items: [
      {
        toolId: "chair",
        name: "Camping Chair",
        categoryLabel: "Camping & Travel",
        image: "chair",
        available: false,
      },
      {
        toolId: "bike",
        name: "City Bicycle",
        categoryLabel: "Sports & Fitness",
        image: "bike",
        available: true,
      },
    ],
    activity: [
      {
        name: "Camping Chair",
        image: "chair",
        when: "Nov 2026",
        status: "borrowed",
      },
      {
        name: "City Bicycle",
        image: "bike",
        when: "Sep 2026",
        status: "returned",
      },
    ],
  },
  david: {
    items: [
      {
        toolId: "drill",
        name: "Power Drill",
        categoryLabel: "DIY & Tools",
        image: "drill",
        available: true,
      },
    ],
    activity: [
      {
        name: "Power Drill",
        image: "drill",
        when: "Nov 2026",
        status: "returned",
      },
    ],
  },
  emma: {
    items: [
      {
        toolId: "cooler",
        name: "Cooler Box",
        categoryLabel: "Camping & Travel",
        image: "cooler",
        available: true,
      },
    ],
    activity: [
      {
        name: "Cooler Box",
        image: "cooler",
        when: "Jul 2026",
        status: "returned",
      },
    ],
  },
  ruben: {
    items: [
      {
        toolId: "osmo-mobile",
        name: "DJI Osmo Mobile",
        categoryLabel: "Electronics",
        image: "gimbal",
        available: true,
      },
      {
        toolId: "tripod",
        name: "Camera Tripod",
        categoryLabel: "Electronics",
        image: "tripod",
        available: false,
      },
    ],
    activity: [
      {
        name: "Camera Tripod",
        image: "tripod",
        when: "Nov 2026",
        status: "borrowed",
      },
      {
        name: "DJI Osmo Mobile",
        image: "gimbal",
        when: "Oct 2026",
        status: "returned",
      },
      {
        name: "Camera Tripod",
        image: "tripod",
        when: "Sep 2026",
        status: "returned",
      },
    ],
  },
  bruno: {
    items: [
      {
        toolId: "grinder",
        name: "Angle Grinder",
        categoryLabel: "DIY & Tools",
        image: "grinder",
        available: false,
      },
    ],
    activity: [
      {
        name: "Angle Grinder",
        image: "grinder",
        when: "Nov 2026",
        status: "borrowed",
      },
    ],
  },
  sara: {
    items: [
      {
        toolId: "drone",
        name: "Drone",
        categoryLabel: "Electronics",
        image: "drone",
        available: false,
      },
      {
        toolId: "games",
        name: "Board Game Bundle",
        categoryLabel: "Books & Games",
        image: "games",
        available: true,
      },
    ],
    activity: [
      { name: "Drone", image: "drone", when: "Nov 2026", status: "borrowed" },
      {
        name: "Board Game Bundle",
        image: "games",
        when: "Oct 2026",
        status: "returned",
      },
    ],
  },
  trevis: {
    items: [
      {
        toolId: "softbox",
        name: "Softbox Kit",
        categoryLabel: "Electronics",
        image: "softbox",
        available: true,
      },
    ],
    activity: [
      {
        name: "Softbox Kit",
        image: "softbox",
        when: "Nov 2026",
        status: "returned",
      },
    ],
  },
};

export function toolImage(image: string): string {
  return `/images/tools/${image}.jpg`;
}
