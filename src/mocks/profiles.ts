import type { PersonId } from "./people";

/** Phase 2 mock content for other members' profile pages (User Profile). */

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
