import { addIsoDays } from "@convex/lib/requestRules";

import { addDays, dayKey, diffDays, isSameDay, parseIsoDate } from "./dates";

/**
 * Date-range selection rules from the Product Details prototype (UI only —
 * Convex re-validates every request, see convex/lib/requestRules.ts).
 * Selections are inclusive (`end` is the last day of use); stored requests
 * are half-open `[startDate, endDate)`.
 */

export type DateRange = { start: Date | null; end: Date | null };

export function buildBookedSet(
  ranges: readonly (readonly [string, string])[],
): Set<number> {
  const set = new Set<number>();
  for (const [from, to] of ranges) {
    const last = parseIsoDate(to);
    for (let d = parseIsoDate(from); d <= last; d = addDays(d, 1)) {
      set.add(dayKey(d));
    }
  }
  return set;
}

/** Booked days from Convex ranges `[startDate, endDate)`. */
export function bookedFromRanges(
  ranges: readonly { startDate: string; endDate: string }[],
): Set<number> {
  return buildBookedSet(
    ranges.map((r) => [r.startDate, addIsoDays(r.endDate, -1)] as const),
  );
}

/** A selection as the half-open range Convex stores. */
export function toRequestDates(start: Date, end: Date) {
  return { startDate: toIsoDate(start), endDate: toIsoDate(addDays(end, 1)) };
}

/** Last selectable end date for a given start (max length or next booking). */
export function selectableLimit(
  start: Date,
  maxDays: number,
  booked: Set<number>,
): Date {
  const last = addDays(start, maxDays - 1);
  for (let d = start; d <= last; d = addDays(d, 1)) {
    if (booked.has(dayKey(d))) return addDays(d, -1);
  }
  return last;
}

/** Applies a day click to the current selection. */
export function pickDate(
  range: DateRange,
  day: Date,
  maxDays: number,
  booked: Set<number>,
): DateRange {
  const { start, end } = range;
  if (!start || end || day < start) return { start: day, end: null };
  if (isSameDay(day, start)) return { start, end: day };
  if (day > selectableLimit(start, maxDays, booked)) {
    return { start: day, end: null };
  }
  return { start, end: day };
}

export function rangeLength(start: Date, end: Date): number {
  return diffDays(start, end) + 1;
}

/** `YYYY-MM-DD` for a local date (used to carry a selection in a URL). */
export function toIsoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Restores a range from URL values (after a sign-in redirect), or null when
 * the values are malformed or no longer a selectable range.
 */
export function restoreRange(
  from: string | null,
  to: string | null,
  today: Date,
  maxDays: number,
  booked: Set<number>,
): { start: Date; end: Date } | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !iso.test(from) || !iso.test(to)) return null;
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  // Reject impossible dates such as 2026-02-31 (they roll over).
  if (toIsoDate(start) !== from || toIsoDate(end) !== to) return null;
  if (start < today || end < start) return null;
  if (booked.has(dayKey(start))) return null;
  if (end > selectableLimit(start, maxDays, booked)) return null;
  return { start, end };
}
