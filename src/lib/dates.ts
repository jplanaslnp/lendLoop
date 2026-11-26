/**
 * Calendar-date helpers (local dates, no time-of-day), mirroring the date
 * maths used by the approved design prototype.
 */

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAYS_SHORT = [
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
  "Su",
] as const;

/** Parses a `YYYY-MM-DD` string into a local Date at midnight. */
export function parseIsoDate(value: string): Date {
  const [y = 0, m = 1, d = 1] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Whole calendar days from `a` to `b` (positive when `b` is later). */
export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 864e5);
}

export function dayKey(date: Date): number {
  return date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** "Nov 28" */
export function formatShort(date: Date): string {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** "Nov 28 – Nov 30, 2026" */
export function formatRangeWithYear(start: Date, end: Date): string {
  return `${formatShort(start)} – ${formatShort(end)}, ${end.getFullYear()}`;
}

export function pluralDays(count: number): string {
  return `${count} day${count === 1 ? "" : "s"}`;
}
