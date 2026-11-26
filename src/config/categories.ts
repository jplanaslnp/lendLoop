import type { IconName } from "@/components/ui/Icon";

/**
 * Categories as shown in the approved design. The final category list is an
 * open decision (docs/DECISIONS.md); this is UI configuration for Phase 2 only.
 */
export const CATEGORIES = [
  { id: "home", label: "Home & Kitchen", icon: "home" },
  { id: "garden", label: "Garden & Outdoor", icon: "garden" },
  { id: "sports", label: "Sports & Fitness", icon: "sports" },
  { id: "camping", label: "Camping & Travel", icon: "camping" },
  { id: "electronics", label: "Electronics", icon: "electronics" },
  { id: "cleaning", label: "Cleaning", icon: "cleaning" },
  { id: "party", label: "Party & Events", icon: "party" },
  { id: "diy", label: "DIY & Tools", icon: "wrench" },
  { id: "kids", label: "Baby & Kids", icon: "kids" },
  { id: "books", label: "Books & Games", icon: "books" },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: IconName;
}[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/** The Explore filter row in the design omits "Party & Events". */
export const EXPLORE_FILTER_CATEGORIES: readonly CategoryId[] = [
  "home",
  "garden",
  "sports",
  "camping",
  "electronics",
  "cleaning",
  "diy",
  "kids",
  "books",
];

export function getCategory(id: CategoryId) {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

export const CONDITIONS = [
  { id: "new", label: "New" },
  { id: "likeNew", label: "Like New" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
] as const;

export type ConditionId = (typeof CONDITIONS)[number]["id"];

export function getConditionLabel(id: ConditionId): string {
  return CONDITIONS.find((c) => c.id === id)?.label ?? id;
}
