/**
 * Listing field rules shared by Convex (authoritative) and the Share form
 * (same messages, earlier feedback). Pure functions, no Convex imports, so
 * the browser bundle can use them too.
 */

export const NAME_MAX = 60;
export const DESCRIPTION_MIN = 15;
export const DESCRIPTION_MAX = 300;
export const AREA_MIN = 2;
export const AREA_MAX = 60;
export const PHOTOS_MIN = 1;
export const PHOTOS_MAX = 4;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ACTIVE_LISTINGS_MAX = 25;
export const PENDING_UPLOADS_MAX = 20;
/** Unattached uploads older than this are deleted by the daily cron. */
export const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

export type ListingField =
  "name" | "category" | "condition" | "description" | "area" | "photos";

export const AREA_MESSAGE =
  "Use the neighbourhood and city only — no street, number, postcode or floor.";

/** Street words that, next to a number, describe an address. */
const STREET_WORDS = [
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "lane",
  "drive",
  "boulevard",
  "blvd",
  "straat",
  "str",
  "laan",
  "weg",
  "steenweg",
  "plein",
  "kaai",
  "dreef",
  "rue",
  "chaussée",
  "calle",
  "carrer",
  "avenida",
  "via",
  "strasse",
  "straße",
];

/** Words that only appear in precise dwelling details. */
const DWELLING_WORDS = [
  "apartment",
  "apt",
  "flat",
  "unit",
  "floor",
  "door",
  "building",
  "block",
  "bus",
  "verdieping",
  "piso",
  "puerta",
  "planta",
  "escalera",
  "étage",
  "etage",
  "appartement",
  "suite",
];

const WORD = (words: readonly string[]) =>
  new RegExp(`(^|[^\\p{L}])(${words.join("|")})\\.?([^\\p{L}]|$)`, "iu");

const STREET_RE = WORD(STREET_WORDS);
const DWELLING_RE = WORD(DWELLING_WORDS);
const STREET_SUFFIX_RE =
  /\p{L}(straat|laan|weg|plein|kaai|dreef|strasse|straße|street)\b/iu;

/**
 * Best-effort check that an area is a neighbourhood/city, not an address.
 * It cannot guarantee privacy: an address written without street words or
 * long numbers (e.g. "Main 5") passes. The form always shows a privacy hint.
 * Short numbers inside a name ("District 9", "Paris 15e") are allowed.
 */
export function areaProblem(raw: string): string | null {
  const area = raw.trim();
  if (area.length < AREA_MIN) return "Add the neighbourhood and city.";
  if (area.length > AREA_MAX) {
    return `Keep it under ${AREA_MAX} characters.`;
  }
  // Letters, marks, digits, spaces and plain punctuation only.
  if (!/^[\p{L}\p{M}\d .,'’()/-]+$/u.test(area)) return AREA_MESSAGE;
  // Postcodes, house numbers: any run of 3+ digits.
  if (/\d{3,}/.test(area)) return AREA_MESSAGE;
  // Decimal numbers (coordinates, "12.5"), degrees.
  if (/\d[.,]\d/.test(area) || /°/.test(area)) return AREA_MESSAGE;
  // UK (SW1A 1AA) and Dutch (1012 AB) postcode shapes.
  if (/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(area)) return AREA_MESSAGE;
  if (/\b\d{4}\s?[A-Z]{2}\b/i.test(area)) return AREA_MESSAGE;
  // Dwelling details and "nº"/"#" markers.
  if (DWELLING_RE.test(area) || /(n[º°o]\.?\s*\d|#)/i.test(area)) {
    return AREA_MESSAGE;
  }
  // A street word plus any number reads as an address ("Veldstraat 12").
  const hasNumber = /\d/.test(area);
  if (hasNumber && (STREET_RE.test(area) || STREET_SUFFIX_RE.test(area))) {
    return AREA_MESSAGE;
  }
  return null;
}

export type ListingTextInput = {
  name: string;
  description: string;
  area: string;
};

/** Text-field problems, keyed by field. Category/condition use validators. */
export function listingTextProblems(
  input: ListingTextInput,
): Partial<Record<ListingField, string>> {
  const problems: Partial<Record<ListingField, string>> = {};
  const name = input.name.trim();
  if (!name) problems.name = "Add a name for your item.";
  else if (name.length > NAME_MAX) {
    problems.name = `Keep the name under ${NAME_MAX} characters.`;
  }
  const description = input.description.trim();
  if (!description) problems.description = "Add a short description.";
  else if (description.length < DESCRIPTION_MIN) {
    problems.description = `Add a little more detail (at least ${DESCRIPTION_MIN} characters).`;
  } else if (description.length > DESCRIPTION_MAX) {
    problems.description = `Keep it under ${DESCRIPTION_MAX} characters.`;
  }
  const area = areaProblem(input.area);
  if (area) problems.area = area;
  return problems;
}

export function photoCountProblem(count: number): string | null {
  if (count < PHOTOS_MIN) return "Add at least one photo.";
  if (count > PHOTOS_MAX) return `You can add up to ${PHOTOS_MAX} photos.`;
  return null;
}
