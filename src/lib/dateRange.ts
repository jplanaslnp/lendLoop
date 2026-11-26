import { addDays, dayKey, diffDays, isSameDay, parseIsoDate } from "./dates";

/**
 * Date-range selection rules from the Product Details prototype (UI only —
 * the backend re-validates availability in later phases).
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
