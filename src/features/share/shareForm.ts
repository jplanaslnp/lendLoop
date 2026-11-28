import type { CategoryId, ConditionId } from "@/config/categories";
import {
  listingTextProblems,
  photoCountProblem,
  PHOTO_MAX_BYTES,
  type ListingField,
} from "@convex/lib/listingRules";

export {
  AREA_MAX,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  NAME_MAX,
  PHOTOS_MAX,
} from "@convex/lib/listingRules";

/**
 * Share a Tool form values and validation. The rules come from
 * convex/lib/listingRules.ts, so the form and Convex always agree; Convex
 * re-checks everything on save.
 */
export type ShareFormValues = {
  name: string;
  category: CategoryId | "";
  condition: ConditionId | "";
  description: string;
  area: string;
  photoCount: number;
};

export type ShareField = ListingField;

export const SHARE_FIELD_ORDER: readonly ShareField[] = [
  "name",
  "category",
  "condition",
  "description",
  "area",
  "photos",
];

export function validateShareForm(
  v: ShareFormValues,
): Partial<Record<ShareField, string>> {
  const errors: Partial<Record<ShareField, string>> = listingTextProblems(v);
  if (!v.category) errors.category = "Choose a category.";
  if (!v.condition) errors.condition = "Select the condition.";
  const photos = photoCountProblem(v.photoCount);
  if (photos) errors.photos = photos;
  return errors;
}

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Early, friendly check before uploading; the server checks the bytes. */
export function photoFileProblem(file: File): string | null {
  if (!PHOTO_TYPES.has(file.type)) return "Use JPEG, PNG or WebP photos.";
  if (file.size > PHOTO_MAX_BYTES) return "Photos can be up to 5 MB.";
  return null;
}
