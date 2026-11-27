import type { Infer } from "convex/values";

import type { categoryValidator, conditionValidator } from "./schema";

/**
 * Development seed data: the tools shown in the approved design, owned by
 * FICTIONAL neighbours. Used only by convex/seed.ts, which refuses to run
 * unless the deployment opts in. Locations are approximate areas only.
 */

export type SeedOwner = {
  key: string;
  name: string;
  locationLabel: string;
};

export type SeedListing = {
  key: string;
  owner: string;
  name: string;
  category: Infer<typeof categoryValidator>;
  condition: Infer<typeof conditionValidator>;
  description: string;
  longDescription?: string;
  conditionNote?: string;
  details?: { label: string; value: string }[];
  photos: { path: string; label: string }[];
};

export const SEED_OWNERS: readonly SeedOwner[] = [
  { key: "marc", name: "Marc Soler", locationLabel: "Patershol, Gent" },
  { key: "laura", name: "Laura Pérez", locationLabel: "Sint-Pieters, Gent" },
  { key: "david", name: "David Ruiz", locationLabel: "Patershol, Gent" },
  { key: "emma", name: "Emma Laurent", locationLabel: "Ledeberg, Gent" },
  { key: "ruben", name: "Ruben Garcia", locationLabel: "Sint-Pieters, Gent" },
  { key: "bruno", name: "Bruno Martin", locationLabel: "Patershol, Gent" },
  { key: "sara", name: "Sara Torres", locationLabel: "Ledeberg, Gent" },
  { key: "trevis", name: "Trevis King", locationLabel: "Muide, Gent" },
];

const photo = (file: string, label = "Main photo") => [
  { path: `/images/tools/${file}.jpg`, label },
];

/** In the design's Explore order (the DJI Osmo, a profile-only item, last). */
export const SEED_LISTINGS: readonly SeedListing[] = [
  {
    key: "projector",
    owner: "marc",
    name: "Projector",
    category: "electronics",
    condition: "like_new",
    description:
      "Full HD portable projector, perfect for movie nights and presentations in the courtyard.",
    photos: photo("projector"),
  },
  {
    key: "chair",
    owner: "laura",
    name: "Camping Chair",
    category: "camping",
    condition: "good",
    description:
      "Lightweight and foldable chair, ideal for camping, beach days or outdoor events.",
    photos: photo("chair"),
  },
  {
    key: "drill",
    owner: "david",
    name: "Power Drill",
    category: "diy",
    condition: "like_new",
    description:
      "Cordless drill with battery and bits set. Great for home DIY projects and shelves.",
    photos: photo("drill"),
  },
  {
    key: "cooler",
    owner: "emma",
    name: "Cooler Box",
    category: "camping",
    condition: "good",
    description:
      "Large capacity cooler, keeps food and drinks cold for hours on long weekends.",
    photos: photo("cooler"),
  },
  {
    key: "tripod",
    owner: "ruben",
    name: "Camera Tripod",
    category: "electronics",
    condition: "like_new",
    description:
      "Adjustable tripod up to 160 cm, compatible with most cameras and phones.",
    photos: photo("tripod"),
  },
  {
    key: "grinder",
    owner: "bruno",
    name: "Angle Grinder",
    category: "diy",
    condition: "good",
    description:
      "Powerful angle grinder for cutting, grinding and polishing metal or tile.",
    photos: photo("grinder"),
  },
  {
    key: "drone",
    owner: "sara",
    name: "Drone",
    category: "electronics",
    condition: "like_new",
    description:
      "4K drone with stabilized camera. Perfect for travel and creative projects.",
    photos: photo("drone"),
  },
  {
    key: "softbox",
    owner: "trevis",
    name: "Softbox Kit",
    category: "electronics",
    condition: "good",
    description:
      "Photography lighting kit with softbox and adjustable stand for portraits.",
    photos: photo("softbox"),
  },
  {
    key: "bike",
    owner: "laura",
    name: "City Bicycle",
    category: "sports",
    condition: "good",
    description:
      "Comfortable 7-speed city bike with basket and lights. Helmet included.",
    photos: photo("bike"),
  },
  {
    key: "mixer",
    owner: "emma",
    name: "Stand Mixer",
    category: "home",
    condition: "like_new",
    description:
      "5L stand mixer with whisk, dough hook and beater. Ideal for weekend baking.",
    photos: [],
  },
  {
    key: "garden",
    owner: "bruno",
    name: "Garden Tool Set",
    category: "garden",
    condition: "fair",
    description:
      "Pruning shears, trowel, rake and gloves for balcony and garden plots.",
    photos: [],
  },
  {
    key: "games",
    owner: "sara",
    name: "Board Game Bundle",
    category: "books",
    condition: "good",
    description:
      "Three family strategy games, complete and sleeved. Great for game nights.",
    photos: photo("games"),
  },
  {
    key: "osmo-mobile",
    owner: "ruben",
    name: "DJI Osmo Mobile",
    category: "electronics",
    condition: "like_new",
    description:
      "Handheld smartphone gimbal that stabilizes your videos and photos.",
    longDescription:
      "Handheld smartphone gimbal that stabilizes your videos and photos for smooth, professional results. Easy to use, lightweight and perfect for travel, events or everyday filming. Folds down small enough for a backpack, and the mini tripod doubles as a handle for longer shots.",
    conditionNote: "Used a handful of times, no visible wear.",
    details: [
      { label: "Brand", value: "DJI" },
      { label: "Model", value: "Osmo Mobile" },
      { label: "Includes", value: "Gimbal, mini tripod, charging cable" },
    ],
    photos: photo("gimbal"),
  },
];
