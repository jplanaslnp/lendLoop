import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { describe, expect, it } from "vitest";

import { validateCodeStep } from "@/features/auth/AuthModal";
import { toAuthError } from "@/features/auth/clerkErrors";
import { safeReturnTo, signInGateUrl } from "@/features/auth/returnTo";
import { parseIsoDate } from "@/lib/dates";
import { buildBookedSet, restoreRange } from "@/lib/dateRange";

describe("safeReturnTo", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeReturnTo("/borrowing")).toBe("/borrowing");
    expect(safeReturnTo("/tools/drill?intent=request&from=2026-12-01")).toBe(
      "/tools/drill?intent=request&from=2026-12-01",
    );
  });

  it.each([
    null,
    "",
    "https://evil.example/borrowing",
    "//evil.example",
    "/\\evil.example",
    "/\tevil.example",
    "javascript:alert(1)",
    "borrowing",
  ])("rejects %s", (value) => {
    expect(safeReturnTo(value)).toBeNull();
  });

  it("builds the Explore sign-in gate URL", () => {
    expect(signInGateUrl("/share")).toBe(
      "/explore?auth=sign-in&redirect_url=%2Fshare",
    );
  });
});

describe("toAuthError", () => {
  const apiError = (code: string, paramName?: string) =>
    new ClerkAPIResponseError("Request failed", {
      status: 422,
      data: [
        {
          code,
          message: "raw message",
          long_message: "Raw long message.",
          meta: paramName ? { param_name: paramName } : {},
        },
      ],
    });

  it("maps a wrong password to the password field", () => {
    expect(
      toAuthError(apiError("form_password_incorrect", "password")),
    ).toEqual({
      field: "password",
      message: "That password isn’t right. Try again.",
    });
  });

  it("maps an existing email to the email field", () => {
    expect(
      toAuthError(apiError("form_identifier_exists", "email_address")),
    ).toMatchObject({ field: "email" });
  });

  it("falls back to Clerk's message and a form-level error", () => {
    expect(toAuthError(apiError("some_new_code"))).toEqual({
      field: null,
      message: "Raw long message.",
    });
    expect(toAuthError(new Error("boom"))).toEqual({
      field: null,
      message: "Something went wrong. Please try again.",
    });
  });
});

describe("validateCodeStep", () => {
  it("requires a 6-digit code and an 8+ character new password", () => {
    expect(validateCodeStep("12345", null)).toEqual({
      code: "Enter the 6-digit code.",
    });
    expect(validateCodeStep("424242", "short")).toEqual({
      password: "Use at least 8 characters.",
    });
    expect(validateCodeStep(" 424242 ", "long enough pw")).toEqual({});
  });
});

describe("restoreRange", () => {
  const today = parseIsoDate("2026-11-26");
  const booked = buildBookedSet([["2026-11-28", "2026-11-30"]]);

  it("restores a valid selection", () => {
    expect(restoreRange("2026-12-01", "2026-12-03", today, 7, booked)).toEqual({
      start: parseIsoDate("2026-12-01"),
      end: parseIsoDate("2026-12-03"),
    });
  });

  it.each([
    ["2026-12-01", null],
    ["2026-12-1", "2026-12-03"],
    ["2026-02-31", "2026-03-01"],
    ["2026-11-20", "2026-11-21"],
    ["2026-11-27", "2026-11-29"],
    ["2026-12-01", "2026-12-12"],
  ])("rejects %s → %s", (from, to) => {
    expect(restoreRange(from, to, today, 7, booked)).toBeNull();
  });
});
