"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import type { SetActiveNavigate } from "@clerk/nextjs/types";
import { useState } from "react";

import { toAuthError, type AuthError } from "./clerkErrors";
import { AUTH_QUERY } from "./returnTo";

/**
 * Clerk custom flows behind the LendLoop auth modal (Clerk Core 3 "future"
 * API): email + password sign-in and sign-up with email-code verification,
 * password reset by email code, and Google OAuth.
 *
 * Passwords and codes go straight to Clerk; nothing is stored or logged here.
 */

/** Which code the "Check your email" step is verifying. */
export type CodeStep = "signup" | "signin";

export type FlowStep =
  | { kind: "form" }
  | { kind: "code"; for: CodeStep; email: string }
  | { kind: "reset"; email: string };

/** Callback page for the Google redirect (see app/sso-callback). */
export const SSO_CALLBACK_PATH = "/sso-callback";

type Result = { error: unknown };

function splitName(fullName: string): { firstName: string; lastName?: string } {
  const [first = "", ...rest] = fullName.trim().split(/\s+/);
  const last = rest.join(" ");
  return last ? { firstName: first, lastName: last } : { firstName: first };
}

const UNSUPPORTED_STEP: AuthError = {
  field: null,
  message:
    "This account needs an extra verification step that LendLoop doesn’t support yet.",
};

/** Clerk's bot check (shown by Clerk) was closed or failed. */
const SECURITY_CHECK: AuthError = {
  field: null,
  message: "Please complete the security check to continue.",
};

export function useAuthFlows({
  navigateAfterAuth,
  getReturnHref,
}: {
  navigateAfterAuth: SetActiveNavigate;
  getReturnHref: () => string;
}) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [step, setStep] = useState<FlowStep>({ kind: "form" });
  const [error, setError] = useState<AuthError | null>(null);
  const [pending, setPending] = useState(false);
  /** Short confirmation, e.g. "We sent a new code". */
  const [notice, setNotice] = useState<string | null>(null);

  /** Runs one Clerk call with a shared pending/error state. */
  const run = async (task: () => Promise<AuthError | null>) => {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const failure = await task();
      if (failure) setError(failure);
    } catch (cause) {
      setError(toAuthError(cause));
    } finally {
      setPending(false);
    }
  };

  const fail = (result: Result): AuthError | null =>
    result.error ? toAuthError(result.error) : null;

  const finalizeSignIn = async () =>
    fail(await signIn.finalize({ navigate: navigateAfterAuth }));

  /** After a password or reset step: finish, or ask for an email code. */
  const continueSignIn = async (email: string): Promise<AuthError | null> => {
    switch (signIn.status) {
      case "complete":
        return finalizeSignIn();
      case "needs_protect_check":
        return SECURITY_CHECK;
      case "needs_client_trust":
      case "needs_second_factor": {
        const emailFactor = signIn.supportedSecondFactors.some(
          (f) => f.strategy === "email_code",
        );
        if (!emailFactor) return UNSUPPORTED_STEP;
        const sent = fail(await signIn.mfa.sendEmailCode());
        if (sent) return sent;
        setStep({ kind: "code", for: "signin", email });
        return null;
      }
      default:
        return UNSUPPORTED_STEP;
    }
  };

  const signInWithPassword = (email: string, password: string) =>
    run(async () => {
      const failed = fail(
        await signIn.password({ identifier: email, password }),
      );
      return failed ?? continueSignIn(email);
    });

  const signUpWithPassword = (input: {
    name: string;
    email: string;
    password: string;
  }) =>
    run(async () => {
      const failed = fail(
        await signUp.password({
          emailAddress: input.email,
          password: input.password,
          ...splitName(input.name),
        }),
      );
      if (failed) return failed;
      if (signUp.status === "complete") {
        return fail(await signUp.finalize({ navigate: navigateAfterAuth }));
      }
      if (signUp.missingFields.includes("protect_check")) return SECURITY_CHECK;
      const sent = fail(await signUp.verifications.sendEmailCode());
      if (sent) return sent;
      setStep({ kind: "code", for: "signup", email: input.email });
      return null;
    });

  const verifyCode = (code: string) =>
    run(async () => {
      if (step.kind !== "code") return null;
      if (step.for === "signup") {
        const failed = fail(
          await signUp.verifications.verifyEmailCode({ code }),
        );
        if (failed) return failed;
        if (signUp.status !== "complete") {
          return signUp.missingFields.includes("protect_check")
            ? SECURITY_CHECK
            : UNSUPPORTED_STEP;
        }
        return fail(await signUp.finalize({ navigate: navigateAfterAuth }));
      }
      const failed = fail(await signIn.mfa.verifyEmailCode({ code }));
      if (failed) return failed;
      return signIn.status === "complete" ? finalizeSignIn() : UNSUPPORTED_STEP;
    });

  const resendCode = () =>
    run(async () => {
      const result =
        step.kind === "reset"
          ? await signIn.resetPasswordEmailCode.sendCode()
          : step.kind === "code" && step.for === "signup"
            ? await signUp.verifications.sendEmailCode()
            : await signIn.mfa.sendEmailCode();
      const failed = fail(result);
      if (!failed) setNotice("We sent you a new code.");
      return failed;
    });

  const startPasswordReset = (email: string) =>
    run(async () => {
      const created = fail(await signIn.create({ identifier: email }));
      if (created) return created;
      const sent = fail(await signIn.resetPasswordEmailCode.sendCode());
      if (sent) return sent;
      setStep({ kind: "reset", email });
      return null;
    });

  const completePasswordReset = (code: string, password: string) =>
    run(async () => {
      if (step.kind !== "reset") return null;
      // A previous attempt may already have verified the code.
      if (signIn.status !== "needs_new_password") {
        const verified = fail(
          await signIn.resetPasswordEmailCode.verifyCode({ code }),
        );
        if (verified) return verified;
      }
      if (signIn.status === "needs_new_password") {
        const saved = fail(
          await signIn.resetPasswordEmailCode.submitPassword({
            password,
            signOutOfOtherSessions: true,
          }),
        );
        if (saved) {
          return saved.field === null ? { ...saved, field: "password" } : saved;
        }
      }
      return continueSignIn(step.email);
    });

  const continueWithGoogle = () =>
    run(async () => {
      // Leaves the page; Google returns to /sso-callback, then to the page
      // (and intended action) the visitor started from.
      const returnHref = getReturnHref();
      const callback = `${SSO_CALLBACK_PATH}?${new URLSearchParams({
        [AUTH_QUERY.redirect]: returnHref,
      }).toString()}`;
      return fail(
        await signIn.sso({
          strategy: "oauth_google",
          redirectUrl: returnHref,
          redirectCallbackUrl: callback,
        }),
      );
    });

  const backToForm = () => {
    setStep({ kind: "form" });
    setError(null);
    setNotice(null);
  };

  const clearError = () => setError(null);

  return {
    step,
    error,
    notice,
    pending,
    signInWithPassword,
    signUpWithPassword,
    verifyCode,
    resendCode,
    startPasswordReset,
    completePasswordReset,
    continueWithGoogle,
    backToForm,
    clearError,
  };
}
