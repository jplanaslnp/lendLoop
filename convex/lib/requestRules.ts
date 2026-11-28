/**
 * Borrow-request date rules (Phase 7, docs/DECISIONS.md). Pure functions,
 * shared by Convex (which enforces them) and the product page (which only
 * mirrors them for a friendly calendar).
 *
 * Date model: a request covers the half-open range `[startDate, endDate)`
 * of calendar days, stored as `YYYY-MM-DD` strings. `endDate` is the day
 * AFTER the last day of use, so a one-day loan on Nov 28 is
 * `["2026-11-28", "2026-11-29")`. Dates are never converted to timestamps:
 * day arithmetic uses UTC day numbers, so daylight-saving changes (23- or
 * 25-hour days) can't shift a range.
 *
 * "Today" is the borrower's local calendar date: the server's clock read in
 * the IANA time zone the browser declares. The time zone is a calendar
 * preference, not a verified location — see `normalizeTimeZone`.
 */

export const LOAN_DAYS_MAX = 7;
/** The last allowed start date is today + 90 days. */
export const ADVANCE_DAYS_MAX = 90;
export const MESSAGE_MAX = 200;
/** Open (pending) requests a borrower may have at once. */
export const PENDING_REQUESTS_MAX = 20;

/** Statuses that hold the item's dates (docs/06). Pending does not. */
export const BLOCKING_STATUSES = [
  "approved",
  "ready_for_pickup",
  "borrowed",
  "overdue",
  "return_pending",
] as const;

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a real `YYYY-MM-DD` date, else null. */
export function dayNumber(iso: string): number | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  const back = new Date(ms);
  // Rejects impossible dates such as 2026-02-31 (they roll over).
  if (
    back.getUTCFullYear() !== y ||
    back.getUTCMonth() !== m - 1 ||
    back.getUTCDate() !== d
  ) {
    return null;
  }
  return Math.round(ms / DAY_MS);
}

export function isoFromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** `iso` plus `days` calendar days (iso must be a real date). */
export function addIsoDays(iso: string, days: number): string {
  const day = dayNumber(iso);
  if (day === null) throw new Error(`Not a date: ${iso}`);
  return isoFromDayNumber(day + days);
}

/** Half-open ranges `[aStart, aEnd)` and `[bStart, bEnd)` share a day. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  // Canonical ISO dates compare correctly as strings.
  return aStart < bEnd && bStart < aEnd;
}

const TIME_ZONE_MAX = 64;
/**
 * IANA-style names only: "Europe/Brussels", "America/Argentina/Buenos_Aires",
 * "Etc/GMT+12", "UTC". Rejects UTC offsets such as "+02:00", which `Intl`
 * would otherwise accept.
 */
const TIME_ZONE_NAME =
  /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9][A-Za-z0-9_+-]*){0,2}$/;

/**
 * The canonical IANA name of a declared time zone, or null if it is not a
 * time zone the runtime knows. Aliases resolve to one name (for example
 * "Asia/Kolkata" and "Asia/Calcutta" give the same result), so every
 * spelling of a zone behaves identically.
 *
 * This is the borrower's DECLARED calendar zone. It is not a verified
 * location or identity: a user can pick any real zone. That can move
 * "today" by at most about a day either way, because every real zone is
 * within UTC−12…UTC+14 of the server's clock.
 */
export function normalizeTimeZone(value: string): string | null {
  if (value.length === 0 || value.length > TIME_ZONE_MAX) return null;
  if (!TIME_ZONE_NAME.test(value)) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/** The calendar date (`YYYY-MM-DD`) at instant `nowMs` in `timeZone`. */
export function todayIn(timeZone: string, nowMs: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs));
  const part = (type: "year" | "month" | "day") =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export type RequestDateProblem =
  | "invalid_timezone"
  | "invalid_date"
  | "end_not_after_start"
  | "too_long"
  | "in_past"
  | "too_far_ahead";

export const DATE_PROBLEM_MESSAGES: Record<RequestDateProblem, string> = {
  invalid_timezone: "Your device's time zone isn't recognised.",
  invalid_date: "Choose valid dates.",
  end_not_after_start: "The end date must be after the start date.",
  too_long: `Loans can last up to ${LOAN_DAYS_MAX} days.`,
  in_past: "Choose a start date from today onwards.",
  too_far_ahead: `You can request up to ${ADVANCE_DAYS_MAX} days ahead.`,
};

export type CheckedRequestDates =
  | {
      ok: true;
      startDate: string;
      endDate: string;
      timeZone: string;
      days: number;
      today: string;
    }
  | { ok: false; problem: RequestDateProblem };

/**
 * Validates a requested range against the SERVER's clock (`nowMs`) in the
 * declared time zone: real dates, 1–7 days, starting between today and
 * today + 90 days.
 */
export function checkRequestDates(
  input: { startDate: string; endDate: string; timeZone: string },
  nowMs: number,
): CheckedRequestDates {
  const timeZone = normalizeTimeZone(input.timeZone);
  if (!timeZone) return { ok: false, problem: "invalid_timezone" };
  const start = dayNumber(input.startDate);
  const end = dayNumber(input.endDate);
  if (start === null || end === null) {
    return { ok: false, problem: "invalid_date" };
  }
  const days = end - start;
  if (days < 1) return { ok: false, problem: "end_not_after_start" };
  if (days > LOAN_DAYS_MAX) return { ok: false, problem: "too_long" };
  const today = todayIn(timeZone, nowMs);
  const todayNumber = dayNumber(today);
  if (todayNumber === null) return { ok: false, problem: "invalid_timezone" };
  if (start < todayNumber) return { ok: false, problem: "in_past" };
  if (start > todayNumber + ADVANCE_DAYS_MAX) {
    return { ok: false, problem: "too_far_ahead" };
  }
  return {
    ok: true,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone,
    days,
    today,
  };
}

/** Trimmed optional message, `undefined` when empty, null when invalid. */
export function normalizeMessage(
  value: string | undefined,
): string | undefined | null {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (Array.from(trimmed).length > MESSAGE_MAX) return null;
  // Plain text: line breaks and tabs are fine, other control characters not.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/** Client-generated retry key: 8–64 letters, digits or dashes. */
export function isIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9-]{8,64}$/.test(value);
}

/**
 * The UTC instant at which calendar day `iso` begins in `timeZone` (local
 * midnight, or the first existing instant of that day when a DST change
 * skips midnight). Every real zone is within UTC−12…UTC+14, so the answer
 * lies within ±16 hours of UTC midnight; a binary search on "which local
 * date is it at instant t" finds it to the millisecond.
 */
export function startOfDayIn(iso: string, timeZone: string): number {
  const day = dayNumber(iso);
  if (day === null) throw new Error(`Not a date: ${iso}`);
  const margin = 16 * 3_600_000;
  let lo = day * DAY_MS - margin; // still the previous local day
  let hi = day * DAY_MS + margin; // already `iso` (or later) locally
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (todayIn(timeZone, mid) >= iso) hi = mid;
    else lo = mid;
  }
  return hi;
}
