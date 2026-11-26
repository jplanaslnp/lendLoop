import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

/**
 * Turns a Clerk error into copy for the LendLoop auth modal: either a message
 * for one form field or a general message for the whole form. Messages are
 * shown to the person signing in only and never logged.
 */

export type AuthErrorField = "name" | "email" | "password" | "code";

export type AuthError = { field: AuthErrorField | null; message: string };

const FALLBACK = "Something went wrong. Please try again.";

/** Friendlier copy for the errors people hit most often. */
const MESSAGES: Record<string, string> = {
  form_identifier_not_found: "We couldn’t find an account with that email.",
  form_password_incorrect: "That password isn’t right. Try again.",
  form_identifier_exists:
    "An account with this email already exists. Sign in instead.",
  form_password_pwned:
    "This password has appeared in a data breach. Please choose a different one.",
  form_code_incorrect: "That code isn’t right. Check your email and try again.",
  verification_expired: "That code has expired. Send a new one.",
  verification_failed: "Too many attempts. Send a new code and try again.",
  too_many_requests: "Too many attempts. Please wait a moment and try again.",
  strategy_for_user_invalid:
    "This account doesn’t use a password. Continue with Google instead.",
  session_exists: "You’re already signed in.",
};

const PARAM_TO_FIELD: Record<string, AuthErrorField> = {
  identifier: "email",
  email_address: "email",
  password: "password",
  code: "code",
  first_name: "name",
  last_name: "name",
};

export function toAuthError(error: unknown): AuthError {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    if (!first) return { field: null, message: FALLBACK };
    const meta = first.meta as { paramName?: unknown } | undefined;
    const param = typeof meta?.paramName === "string" ? meta.paramName : "";
    return {
      field: PARAM_TO_FIELD[param] ?? null,
      message: MESSAGES[first.code] ?? first.longMessage ?? first.message,
    };
  }
  if (error instanceof Error && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "network_error") {
      return {
        field: null,
        message: "You seem to be offline. Check your connection.",
      };
    }
  }
  return { field: null, message: FALLBACK };
}
