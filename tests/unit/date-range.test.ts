import { describe, expect, it } from "vitest";

import { formatRangeWithYear, parseIsoDate, pluralDays } from "@/lib/dates";
import {
  buildBookedSet,
  pickDate,
  rangeLength,
  selectableLimit,
} from "@/lib/dateRange";

const d = parseIsoDate;
const booked = buildBookedSet([["2026-11-28", "2026-11-30"]]);

describe("date helpers", () => {
  it("formats ranges and day counts like the design", () => {
    expect(formatRangeWithYear(d("2026-11-28"), d("2026-11-30"))).toBe(
      "Nov 28 – Nov 30, 2026",
    );
    expect(pluralDays(1)).toBe("1 day");
    expect(pluralDays(3)).toBe("3 days");
    expect(rangeLength(d("2026-12-01"), d("2026-12-03"))).toBe(3);
  });
});

describe("date-range selection (UI)", () => {
  it("stops the selectable range before the next booked day", () => {
    expect(selectableLimit(d("2026-11-26"), 7, booked)).toEqual(
      d("2026-11-27"),
    );
  });

  it("limits a range to the maximum loan length", () => {
    expect(selectableLimit(d("2026-12-01"), 7, booked)).toEqual(
      d("2026-12-07"),
    );
  });

  it("picks start, then end, and restarts on an out-of-reach day", () => {
    let range = pickDate(
      { start: null, end: null },
      d("2026-12-01"),
      7,
      booked,
    );
    expect(range).toEqual({ start: d("2026-12-01"), end: null });

    range = pickDate(range, d("2026-12-03"), 7, booked);
    expect(range).toEqual({ start: d("2026-12-01"), end: d("2026-12-03") });

    // A new click after a complete range starts over.
    range = pickDate(range, d("2026-12-05"), 7, booked);
    expect(range).toEqual({ start: d("2026-12-05"), end: null });

    // Beyond the 7-day limit: becomes the new start.
    range = pickDate(range, d("2026-12-20"), 7, booked);
    expect(range).toEqual({ start: d("2026-12-20"), end: null });
  });

  it("allows a single-day range", () => {
    const start = pickDate(
      { start: null, end: null },
      d("2026-12-01"),
      7,
      booked,
    );
    expect(pickDate(start, d("2026-12-01"), 7, booked)).toEqual({
      start: d("2026-12-01"),
      end: d("2026-12-01"),
    });
  });
});
