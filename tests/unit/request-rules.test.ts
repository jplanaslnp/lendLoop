import { describe, expect, it } from "vitest";

import {
  addIsoDays,
  checkRequestDates,
  dayNumber,
  isIdempotencyKey,
  normalizeMessage,
  normalizeTimeZone,
  rangesOverlap,
  todayIn,
} from "@convex/lib/requestRules";

const at = (iso: string) => Date.parse(iso);

describe("calendar dates", () => {
  it("accepts only real YYYY-MM-DD dates", () => {
    expect(dayNumber("2026-11-28")).not.toBeNull();
    expect(dayNumber("2028-02-29")).not.toBeNull();
    for (const bad of [
      "2026-02-31",
      "2027-02-29",
      "2026-13-01",
      "2026-1-5",
      "28-11-2026",
      "2026-11-28T00:00",
      "",
    ]) {
      expect(dayNumber(bad), bad).toBeNull();
    }
  });

  it("adds days across months, years, leap days and DST changes", () => {
    expect(addIsoDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addIsoDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addIsoDays("2028-02-28", 1)).toBe("2028-02-29");
    // Europe's DST weekends: still exactly one calendar day per step.
    expect(addIsoDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addIsoDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("treats ranges as half-open [start, end)", () => {
    // Back-to-back loans share no day.
    expect(
      rangesOverlap("2026-12-01", "2026-12-03", "2026-12-03", "2026-12-05"),
    ).toBe(false);
    expect(
      rangesOverlap("2026-12-01", "2026-12-04", "2026-12-03", "2026-12-05"),
    ).toBe(true);
    // One range inside another, and the same single day.
    expect(
      rangesOverlap("2026-12-01", "2026-12-08", "2026-12-03", "2026-12-04"),
    ).toBe(true);
    expect(
      rangesOverlap("2026-12-02", "2026-12-03", "2026-12-02", "2026-12-03"),
    ).toBe(true);
  });
});

describe("declared time zone", () => {
  it("accepts IANA names and returns one canonical name per zone", () => {
    expect(normalizeTimeZone("Europe/Brussels")).toBe("Europe/Brussels");
    expect(normalizeTimeZone("europe/brussels")).toBe("Europe/Brussels");
    expect(normalizeTimeZone("UTC")).toBe("UTC");
    expect(normalizeTimeZone("Etc/GMT+12")).toBe("Etc/GMT+12");
    expect(normalizeTimeZone("America/Argentina/Buenos_Aires")).not.toBeNull();
    // Old and new spellings of the same zone behave identically.
    expect(normalizeTimeZone("Asia/Kolkata")).toBe(
      normalizeTimeZone("Asia/Calcutta"),
    );
    expect(normalizeTimeZone("Europe/Kyiv")).toBe(
      normalizeTimeZone("Europe/Kiev"),
    );
  });

  it("rejects offsets, unknown zones and junk", () => {
    for (const bad of [
      "+02:00",
      "-05:00",
      "GMT+2:00",
      "Mars/Phobos",
      "",
      " Europe/Brussels",
      "UTC; DROP",
      "Europe/Brussels/../x",
      `Europe/${"x".repeat(70)}`,
    ]) {
      expect(normalizeTimeZone(bad), bad).toBeNull();
    }
  });

  it("reads today from the given instant in that zone", () => {
    const now = at("2026-11-28T10:30:00Z");
    expect(todayIn("Pacific/Kiritimati", now)).toBe("2026-11-29"); // +14
    expect(todayIn("Etc/GMT+12", now)).toBe("2026-11-27"); // −12
    expect(todayIn("Europe/Brussels", now)).toBe("2026-11-28");
  });

  it("handles DST transitions and non-hour offsets", () => {
    // Brussels springs forward at 01:00Z on 2026-03-29.
    expect(todayIn("Europe/Brussels", at("2026-03-28T22:59:00Z"))).toBe(
      "2026-03-28",
    );
    expect(todayIn("Europe/Brussels", at("2026-03-28T23:00:00Z"))).toBe(
      "2026-03-29",
    );
    // Brussels falls back at 01:00Z on 2026-10-25 (midnight is 22:00Z).
    expect(todayIn("Europe/Brussels", at("2026-10-24T21:59:00Z"))).toBe(
      "2026-10-24",
    );
    expect(todayIn("Europe/Brussels", at("2026-10-24T22:00:00Z"))).toBe(
      "2026-10-25",
    );
    // New York springs forward on 2026-03-08 (midnight is 05:00Z).
    expect(todayIn("America/New_York", at("2026-03-08T04:59:00Z"))).toBe(
      "2026-03-07",
    );
    expect(todayIn("America/New_York", at("2026-03-08T05:00:00Z"))).toBe(
      "2026-03-08",
    );
    // Kathmandu is +5:45; Lord Howe is +11 in its summer (30-minute DST).
    expect(todayIn("Asia/Kathmandu", at("2026-11-28T18:14:00Z"))).toBe(
      "2026-11-28",
    );
    expect(todayIn("Asia/Kathmandu", at("2026-11-28T18:15:00Z"))).toBe(
      "2026-11-29",
    );
    expect(todayIn("Australia/Lord_Howe", at("2026-11-28T12:59:00Z"))).toBe(
      "2026-11-28",
    );
    expect(todayIn("Australia/Lord_Howe", at("2026-11-28T13:00:00Z"))).toBe(
      "2026-11-29",
    );
  });
});

describe("checkRequestDates", () => {
  const now = at("2026-11-28T10:00:00Z");
  const check = (startDate: string, endDate: string, timeZone = "UTC") =>
    checkRequestDates({ startDate, endDate, timeZone }, now);
  const problem = (...args: Parameters<typeof check>) => {
    const result = check(...args);
    return result.ok ? null : result.problem;
  };

  it("accepts 1 to 7 days starting today up to 90 days ahead", () => {
    expect(check("2026-11-28", "2026-11-29")).toMatchObject({
      ok: true,
      days: 1,
      timeZone: "UTC",
      today: "2026-11-28",
    });
    expect(check("2026-11-28", "2026-12-05")).toMatchObject({ days: 7 });
    expect(check("2027-02-26", "2027-02-27").ok).toBe(true); // today + 90
  });

  it("rejects the edges of the allowed window", () => {
    expect(problem("2026-11-27", "2026-11-28")).toBe("in_past");
    expect(problem("2027-02-27", "2027-02-28")).toBe("too_far_ahead"); // + 91
    expect(problem("2026-11-28", "2026-12-06")).toBe("too_long"); // 8 days
    expect(problem("2026-11-29", "2026-11-29")).toBe("end_not_after_start");
    expect(problem("2026-11-30", "2026-11-29")).toBe("end_not_after_start");
    expect(problem("2026-02-31", "2026-03-02")).toBe("invalid_date");
    expect(problem("2026-11-29", "2026-11-30", "+02:00")).toBe(
      "invalid_timezone",
    );
  });

  it("uses the borrower's local today, never a date that ended everywhere", () => {
    // 10:00Z: Nov 29 in Kiritimati, Nov 27 at UTC−12.
    expect(problem("2026-11-28", "2026-11-29", "Pacific/Kiritimati")).toBe(
      "in_past",
    );
    expect(check("2026-11-27", "2026-11-28", "Etc/GMT+12").ok).toBe(true);
    expect(problem("2026-11-27", "2026-11-28", "Europe/Brussels")).toBe(
      "in_past",
    );
    // Nov 26 has ended in every time zone.
    for (const zone of ["Etc/GMT+12", "Pacific/Niue", "UTC"]) {
      expect(problem("2026-11-26", "2026-11-27", zone)).toBe("in_past");
    }
  });

  it("rolls over at local midnight", () => {
    const beforeMidnight = at("2026-11-28T22:59:00Z"); // 23:59 in Brussels
    const afterMidnight = at("2026-11-28T23:00:00Z"); // 00:00 on Nov 29
    const input = {
      startDate: "2026-11-28",
      endDate: "2026-11-29",
      timeZone: "Europe/Brussels",
    };
    expect(checkRequestDates(input, beforeMidnight).ok).toBe(true);
    expect(checkRequestDates(input, afterMidnight)).toEqual({
      ok: false,
      problem: "in_past",
    });
  });

  it("counts loans over a DST weekend in calendar days", () => {
    const march = at("2026-03-20T12:00:00Z");
    const result = checkRequestDates(
      {
        startDate: "2026-03-27",
        endDate: "2026-04-03",
        timeZone: "Europe/Brussels",
      },
      march,
    );
    expect(result).toMatchObject({ ok: true, days: 7 });
  });
});

describe("message and retry key", () => {
  it("keeps plain text up to 200 characters", () => {
    expect(normalizeMessage(undefined)).toBeUndefined();
    expect(normalizeMessage("   ")).toBeUndefined();
    expect(normalizeMessage("  Hi there\nThanks!  ")).toBe("Hi there\nThanks!");
    expect(normalizeMessage("é".repeat(200))).toBe("é".repeat(200));
    expect(normalizeMessage("x".repeat(201))).toBeNull();
    expect(normalizeMessage("bell\u0007")).toBeNull();
  });

  it("accepts UUID-like retry keys only", () => {
    expect(isIdempotencyKey("3f1c2b9e-1d2a-4f3b-9c8d-123456789abc")).toBe(true);
    expect(isIdempotencyKey("short")).toBe(false);
    expect(isIdempotencyKey("x".repeat(65))).toBe(false);
    expect(isIdempotencyKey("has space 1234")).toBe(false);
  });
});
