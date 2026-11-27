import type { Infer } from "convex/values";

import type { IconName } from "@/components/ui/Icon";
import type { categoryValidator, conditionValidator } from "@convex/schema";

/**
 * The approved categories (docs/DECISIONS.md, Phase 5). Ids must match
 * `categoryValidator` in convex/schema.ts; the check below enforces it.
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
  { id: "like_new", label: "Like New" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
] as const;

export type ConditionId = (typeof CONDITIONS)[number]["id"];

export function getConditionLabel(id: ConditionId): string {
  return CONDITIONS.find((c) => c.id === id)?.label ?? id;
}

/* Compile-time check: UI ids and Convex validators list the same values. */
type ConvexCategory = Infer<typeof categoryValidator>;
type ConvexCondition = Infer<typeof conditionValidator>;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _categoriesMatch: Same<CategoryId, ConvexCategory> = true;
const _conditionsMatch: Same<ConditionId, ConvexCondition> = true;
void _categoriesMatch;
void _conditionsMatch;
