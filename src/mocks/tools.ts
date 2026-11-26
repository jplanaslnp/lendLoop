import type { CategoryId, ConditionId } from "@/config/categories";

import type { PersonId } from "./people";

/** Phase 2 mock catalogue — content copied from the design prototype. */

export type ToolPhoto =
  | { kind: "image"; src: string; label: string }
  | { kind: "placeholder"; label: string };

export type MockTool = {
  id: string;
  name: string;
  description: string;
  /** Long description shown on the product page (falls back to `description`). */
  longDescription?: string;
  category: CategoryId;
  condition: ConditionId;
  conditionNote?: string;
  ownerId: PersonId;
  available: boolean;
  photos: readonly ToolPhoto[];
  details?: readonly { label: string; value: string }[];
  /** Explicit "Similar items nearby" (as in the design for the DJI Osmo). */
  similarIds?: readonly string[];
  /** Shown in Explore. The DJI Osmo only appears via its owner's profile. */
  inExplore: boolean;
};

const photo = (file: string, label = "Main photo"): ToolPhoto => ({
  kind: "image",
  src: `/images/tools/${file}.jpg`,
  label,
});

/** Loans can last up to this many days (design: "Max. loan · Up to 7 days"). */
export const MAX_LOAN_DAYS = 7;

/** Booked ranges from the design calendar (inclusive, YYYY-MM-DD). */
export const MOCK_BOOKED_RANGES: readonly (readonly [string, string])[] = [
  ["2026-11-28", "2026-11-30"],
  ["2026-12-08", "2026-12-10"],
  ["2026-12-18", "2026-12-21"],
  ["2027-01-04", "2027-01-06"],
];

export const TOOLS: readonly MockTool[] = [
  {
    id: "projector",
    name: "Projector",
    description:
      "Full HD portable projector, perfect for movie nights and presentations in the courtyard.",
    category: "electronics",
    condition: "likeNew",
    ownerId: "marc",
    available: true,
    photos: [photo("projector")],
    inExplore: true,
  },
  {
    id: "chair",
    name: "Camping Chair",
    description:
      "Lightweight and foldable chair, ideal for camping, beach days or outdoor events.",
    category: "camping",
    condition: "good",
    ownerId: "laura",
    available: false,
    photos: [photo("chair")],
    inExplore: true,
  },
  {
    id: "drill",
    name: "Power Drill",
    description:
      "Cordless drill with battery and bits set. Great for home DIY projects and shelves.",
    category: "diy",
    condition: "likeNew",
    ownerId: "david",
    available: true,
    photos: [photo("drill")],
    inExplore: true,
  },
  {
    id: "cooler",
    name: "Cooler Box",
    description:
      "Large capacity cooler, keeps food and drinks cold for hours on long weekends.",
    category: "camping",
    condition: "good",
    ownerId: "emma",
    available: true,
    photos: [photo("cooler")],
    inExplore: true,
  },
  {
    id: "tripod",
    name: "Camera Tripod",
    description:
      "Adjustable tripod up to 160 cm, compatible with most cameras and phones.",
    category: "electronics",
    condition: "likeNew",
    ownerId: "ruben",
    available: true,
    photos: [photo("tripod")],
    inExplore: true,
  },
  {
    id: "grinder",
    name: "Angle Grinder",
    description:
      "Powerful angle grinder for cutting, grinding and polishing metal or tile.",
    category: "diy",
    condition: "good",
    ownerId: "bruno",
    available: true,
    photos: [photo("grinder")],
    inExplore: true,
  },
  {
    id: "drone",
    name: "Drone",
    description:
      "4K drone with stabilized camera. Perfect for travel and creative projects.",
    category: "electronics",
    condition: "likeNew",
    ownerId: "sara",
    available: false,
    photos: [photo("drone")],
    inExplore: true,
  },
  {
    id: "softbox",
    name: "Softbox Kit",
    description:
      "Photography lighting kit with softbox and adjustable stand for portraits.",
    category: "electronics",
    condition: "good",
    ownerId: "trevis",
    available: true,
    photos: [photo("softbox")],
    inExplore: true,
  },
  {
    id: "bike",
    name: "City Bicycle",
    description:
      "Comfortable 7-speed city bike with basket and lights. Helmet included.",
    category: "sports",
    condition: "good",
    ownerId: "laura",
    available: true,
    photos: [photo("bike")],
    inExplore: true,
  },
  {
    id: "mixer",
    name: "Stand Mixer",
    description:
      "5L stand mixer with whisk, dough hook and beater. Ideal for weekend baking.",
    category: "home",
    condition: "likeNew",
    ownerId: "emma",
    available: true,
    photos: [{ kind: "placeholder", label: "Main photo" }],
    inExplore: true,
  },
  {
    id: "garden",
    name: "Garden Tool Set",
    description:
      "Pruning shears, trowel, rake and gloves for balcony and garden plots.",
    category: "garden",
    condition: "fair",
    ownerId: "bruno",
    available: false,
    photos: [{ kind: "placeholder", label: "Main photo" }],
    inExplore: true,
  },
  {
    id: "games",
    name: "Board Game Bundle",
    description:
      "Three family strategy games, complete and sleeved. Great for game nights.",
    category: "books",
    condition: "good",
    ownerId: "sara",
    available: true,
    photos: [photo("games")],
    inExplore: true,
  },
  {
    id: "osmo-mobile",
    name: "DJI Osmo Mobile",
    description:
      "Handheld smartphone gimbal that stabilizes your videos and photos.",
    longDescription:
      "Handheld smartphone gimbal that stabilizes your videos and photos for smooth, professional results. Easy to use, lightweight and perfect for travel, events or everyday filming. Folds down small enough for a backpack, and the mini tripod doubles as a handle for longer shots.",
    category: "electronics",
    condition: "likeNew",
    conditionNote: "Used a handful of times, no visible wear.",
    ownerId: "ruben",
    available: true,
    photos: [
      photo("gimbal"),
      { kind: "placeholder", label: "Photo 2" },
      { kind: "placeholder", label: "Photo 3" },
    ],
    details: [
      { label: "Brand", value: "DJI" },
      { label: "Model", value: "Osmo Mobile" },
      { label: "Includes", value: "Gimbal, mini tripod, charging cable" },
    ],
    similarIds: ["tripod", "drone", "softbox", "projector"],
    inExplore: false,
  },
];

export function getTool(id: string): MockTool | undefined {
  return TOOLS.find((tool) => tool.id === id);
}

export function getExploreTools(): readonly MockTool[] {
  return TOOLS.filter((tool) => tool.inExplore);
}

export function getSimilarTools(tool: MockTool, limit = 4): MockTool[] {
  if (tool.similarIds) {
    return tool.similarIds
      .map((id) => getTool(id))
      .filter((t): t is MockTool => t !== undefined);
  }
  const sameCategory = TOOLS.filter(
    (t) => t.id !== tool.id && t.inExplore && t.category === tool.category,
  );
  const others = TOOLS.filter(
    (t) => t.id !== tool.id && t.inExplore && t.category !== tool.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}
