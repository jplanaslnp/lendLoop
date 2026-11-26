import type { CategoryId, ConditionId } from "@/config/categories";

/** Share a Tool form values and the design's client-side validation copy. */
export type ShareFormValues = {
  name: string;
  category: CategoryId | "";
  condition: ConditionId | "";
  description: string;
  photoCount: number;
};

export type ShareField =
  "name" | "category" | "condition" | "description" | "photos";

export const SHARE_FIELD_ORDER: readonly ShareField[] = [
  "name",
  "category",
  "condition",
  "description",
  "photos",
];

export const NAME_MAX = 60;
export const DESCRIPTION_MAX = 300;
export const DESCRIPTION_MIN = 15;

export function validateShareForm(
  v: ShareFormValues,
): Partial<Record<ShareField, string>> {
  const errors: Partial<Record<ShareField, string>> = {};
  if (!v.name.trim()) errors.name = "Add a name for your item.";
  if (!v.category) errors.category = "Choose a category.";
  if (!v.condition) errors.condition = "Select the condition.";
  const desc = v.description.trim();
  if (!desc) errors.description = "Add a short description.";
  else if (desc.length < DESCRIPTION_MIN)
    errors.description = `Add a little more detail (at least ${DESCRIPTION_MIN} characters).`;
  if (v.photoCount === 0) errors.photos = "Add at least one photo.";
  return errors;
}
