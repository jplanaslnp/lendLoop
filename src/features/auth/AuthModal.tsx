"use client";

import type { SetActiveNavigate } from "@clerk/nextjs/types";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { Dialog } from "@/components/ui/Dialog";
import { GoogleMark, Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/cn";

import type { AuthErrorField } from "./clerkErrors";
import { useAuthFlows } from "./useAuthFlows";

/**
 * Sign in / Create account modal from the design, connected to Clerk through
 * its custom-flow API (see useAuthFlows). Adds the steps Clerk needs that the
 * static design didn't show: an email-code check and a password reset.
 *
 * The address field is validated as designed but not sent anywhere yet; it
 * gets a home in the Convex profile (Phase 4, see docs/DECISIONS.md).
 */

export type AuthMode = "signin" | "signup";

type Fields = {
  name: string;
  email: string;
  password: string;
  confirm: string;
  address: string;
  terms: boolean;
};

type FieldKey = keyof Fields;

const EMPTY: Fields = {
  name: "",
  email: "",
  password: "",
  confirm: "",
  address: "",
  terms: false,
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export function validateAuth(
  mode: AuthMode,
  f: Fields,
): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {};
  if (!isEmail(f.email)) {
    e.email = f.email.trim()
      ? "Enter a valid email address."
      : "Enter your email address.";
  }
  if (mode === "signin") {
    if (!f.password) e.password = "Enter your password.";
    return e;
  }
  if (!f.name.trim()) e.name = "Enter your full name.";
  if (f.password.length < 8) e.password = "Use at least 8 characters.";
  if (!f.confirm || f.confirm !== f.password)
    e.confirm = "Passwords don’t match.";
  if (f.address.trim().length < 5)
    e.address = "Add your building, floor and neighbourhood.";
  if (!f.terms)
    e.terms = "Please accept the Terms of Service and Privacy Policy.";
  return e;
}

type AuthModalProps = {
  open: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  /** Where a full-page (Google) sign-in should return to. */
  getReturnHref: () => string;
  /** Called by Clerk once the session is active. */
  navigateAfterAuth: SetActiveNavigate;
};

/** Client-side checks for the code and password-reset steps. */
export function validateCodeStep(
  code: string,
  newPassword: string | null,
): Partial<Record<"code" | "password", string>> {
  const e: Partial<Record<"code" | "password", string>> = {};
  if (!/^\d{6}$/.test(code.trim())) e.code = "Enter the 6-digit code.";
  if (newPassword !== null && newPassword.length < 8)
    e.password = "Use at least 8 characters.";
  return e;
}

export function AuthModal({
  open,
  initialMode,
  onClose,
  getReturnHref,
  navigateAfterAuth,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [tried, setTried] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const titleId = useId();
  const flows = useAuthFlows({ navigateAfterAuth, getReturnHref });
  const { step, pending } = flows;

  const serverError = (field: AuthErrorField) =>
    flows.error?.field === field ? flows.error.message : undefined;
  const formError = flows.error?.field === null ? flows.error.message : null;

  const clientErrors = tried ? validateAuth(mode, fields) : {};
  const errors: Partial<Record<FieldKey, string>> = {
    ...clientErrors,
    name: clientErrors.name ?? serverError("name"),
    email: clientErrors.email ?? serverError("email"),
    password: clientErrors.password ?? serverError("password"),
  };
  const set =
    <K extends FieldKey>(key: K) =>
    (value: Fields[K]) =>
      setFields((f) => ({ ...f, [key]: value }));

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setTried(false);
    flows.backToForm();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (Object.keys(validateAuth(mode, fields)).length > 0) {
      setTried(true);
      flows.clearError();
      return;
    }
    setTried(false);
    const email = fields.email.trim();
    if (mode === "signin") {
      void flows.signInWithPassword(email, fields.password);
    } else {
      void flows.signUpWithPassword({
        name: fields.name,
        email,
        password: fields.password,
      });
    }
  };

  const forgot = () => {
    if (!isEmail(fields.email)) {
      setTried(true);
      return;
    }
    setTried(false);
    setCode("");
    setNewPassword("");
    void flows.startPasswordReset(fields.email.trim());
  };

  const [stepTried, setStepTried] = useState(false);
  const stepErrors = stepTried
    ? validateCodeStep(code, step.kind === "reset" ? newPassword : null)
    : {};

  const submitStep = (event: FormEvent) => {
    event.preventDefault();
    const isReset = step.kind === "reset";
    const invalid = validateCodeStep(code, isReset ? newPassword : null);
    if (Object.keys(invalid).length > 0) {
      setStepTried(true);
      flows.clearError();
      return;
    }
    setStepTried(false);
    if (isReset) void flows.completePasswordReset(code.trim(), newPassword);
    else void flows.verifyCode(code.trim());
  };

  const leaveStep = () => {
    setCode("");
    setNewPassword("");
    setStepTried(false);
    flows.backToForm();
  };

  const title =
    step.kind === "code"
      ? "Check your email"
      : step.kind === "reset"
        ? "Reset your password"
        : mode === "signin"
          ? "Welcome back"
          : "Create your account";
  const subtitle =
    step.kind === "code"
      ? `Enter the 6-digit code we sent to ${step.email}.`
      : step.kind === "reset"
        ? `Enter the code we sent to ${step.email} and choose a new password.`
        : mode === "signin"
          ? "Your neighborhood, sharing together."
          : "Join your neighborhood and start sharing.";
  const pwType = showPassword ? "text" : "password";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      overlayClassName="fixed inset-0 z-[100] box-border flex items-stretch justify-center bg-[rgba(31,46,36,.45)] p-0 font-sans backdrop-blur-[5px] sm:items-center sm:p-6"
      panelClassName="relative h-full max-h-full max-w-full overflow-y-auto rounded-none px-5 pt-16 pb-[calc(28px+env(safe-area-inset-bottom))] shadow-auth-modal sm:h-auto sm:max-h-[calc(100vh-48px)] sm:max-w-[540px] sm:rounded-[26px] sm:px-11 sm:pt-10 sm:pb-9"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full border border-solid border-[rgba(47,70,54,.1)] bg-white text-forest hover:bg-hover-sage-2"
      >
        <Icon name="x" size={18} strokeWidth={2.2} />
      </button>

      <div className="flex flex-col items-center text-center">
        <Logo variant="compact" asLink={false} />
        <h2
          id={titleId}
          className="mt-[18px] mb-0 text-[28px] leading-[1.1] font-extrabold tracking-tighter text-forest sm:text-[34px]"
        >
          {title}
        </h2>
        <p className="mt-2 mb-0 text-[15.5px] text-ink-muted">{subtitle}</p>
      </div>

      {step.kind !== "form" ? (
        <form
          onSubmit={submitStep}
          noValidate
          aria-busy={pending}
          className="mt-[22px] flex flex-col gap-4"
        >
          <AuthField
            label={step.kind === "reset" ? "Reset code" : "Verification code"}
            icon="mail"
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={setCode}
            error={stepErrors.code ?? serverError("code")}
          />
          {step.kind === "reset" ? (
            <AuthField
              label="New password"
              icon="lock"
              type={pwType}
              autoComplete="new-password"
              placeholder="8+ characters"
              value={newPassword}
              onChange={setNewPassword}
              error={stepErrors.password ?? serverError("password")}
              trailing={
                <PasswordToggle
                  shown={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                />
              }
            />
          ) : null}
          <FormNotice error={formError} notice={flows.notice} />
          <SubmitButton pending={pending}>
            {step.kind === "reset" ? "Reset password" : "Verify and continue"}
          </SubmitButton>
          <p className="m-0 text-center text-[15px] text-ink-muted">
            Didn&apos;t get it?{" "}
            <InlineSwitch onClick={() => void flows.resendCode()}>
              Send a new code
            </InlineSwitch>
          </p>
          <p className="m-0 text-center text-[15px] text-ink-muted">
            <InlineSwitch onClick={leaveStep}>
              {step.kind === "reset"
                ? "Back to sign in"
                : "Use a different email"}
            </InlineSwitch>
          </p>
        </form>
      ) : null}

      <div
        hidden={step.kind !== "form"}
        role="tablist"
        aria-label="Account"
        className="mt-[22px] grid grid-cols-2 gap-1 rounded-full border border-solid border-[rgba(47,70,54,.12)] bg-white p-1"
      >
        <ModeTab
          active={mode === "signin"}
          onClick={() => switchMode("signin")}
        >
          Sign in
        </ModeTab>
        <ModeTab
          active={mode === "signup"}
          onClick={() => switchMode("signup")}
        >
          Create account
        </ModeTab>
      </div>

      {step.kind !== "form" ? null : mode === "signin" ? (
        <form
          onSubmit={submit}
          noValidate
          aria-busy={pending}
          className="mt-[22px] flex flex-col gap-4"
        >
          <AuthField
            label="Email address"
            icon="mail"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={fields.email}
            onChange={set("email")}
            error={errors.email}
          />
          <AuthField
            label="Password"
            icon="lock"
            type={pwType}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={fields.password}
            onChange={set("password")}
            error={errors.password}
            trailing={
              <PasswordToggle
                shown={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
              />
            }
          />
          <div className="-mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={forgot}
              className="border-none bg-transparent px-0 py-1 text-[14.5px] font-bold text-primary"
            >
              Forgot your password?
            </button>
          </div>
          <FormNotice error={formError} notice={flows.notice} />
          <SubmitButton pending={pending}>Sign in</SubmitButton>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-ink-soft">
            <span className="h-px bg-[rgba(47,70,54,.14)]" />
            Or continue with
            <span className="h-px bg-[rgba(47,70,54,.14)]" />
          </div>
          <button
            type="button"
            onClick={() => void flows.continueWithGoogle()}
            disabled={pending}
            className="flex min-h-[52px] items-center justify-center gap-3 rounded-full border border-solid border-[rgba(47,70,54,.16)] bg-white text-base font-semibold text-forest hover:bg-field-alt"
          >
            <GoogleMark />
            Continue with Google
          </button>
          <p className="mt-1 mb-0 text-center text-[15px] text-ink-muted">
            Don&apos;t have an account?{" "}
            <InlineSwitch onClick={() => switchMode("signup")}>
              Create account
            </InlineSwitch>
          </p>
        </form>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          aria-busy={pending}
          className="mt-[22px] flex flex-col gap-4"
        >
          <AuthField
            label="Full name"
            icon="user"
            autoComplete="name"
            placeholder="e.g. Jaume Planas"
            value={fields.name}
            onChange={set("name")}
            error={errors.name}
          />
          <AuthField
            label="Email address"
            icon="mail"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={fields.email}
            onChange={set("email")}
            error={errors.email}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AuthField
              label="Password"
              icon="lock"
              type={pwType}
              autoComplete="new-password"
              placeholder="8+ characters"
              value={fields.password}
              onChange={set("password")}
              error={errors.password}
              trailing={
                <PasswordToggle
                  shown={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                />
              }
            />
            <AuthField
              label="Confirm password"
              icon="lock"
              type={pwType}
              autoComplete="new-password"
              placeholder="Repeat password"
              value={fields.confirm}
              onChange={set("confirm")}
              error={errors.confirm}
            />
          </div>
          <AuthField
            label="Your address"
            icon="pin"
            autoComplete="street-address"
            placeholder="Building, floor, neighbourhood — e.g. Building A, 3rd floor, Gent"
            value={fields.address}
            onChange={set("address")}
            error={errors.address}
          />
          <div
            className="box-content aspect-[3/1] max-h-[150px] w-full rounded-[14px] border border-solid border-[rgba(47,70,54,.1)] bg-cover bg-center transition-opacity duration-200"
            style={{
              backgroundImage: "url(/images/misc/map.jpg)",
              opacity: fields.address.trim().length >= 5 ? 1 : 0.7,
            }}
            aria-hidden
          />
          <div className="-mt-1.5 flex items-center gap-2.5 rounded-field bg-lavender-soft px-3.5 py-3 text-sm text-forest">
            <Icon name="info" size={18} className="flex-none text-primary" />
            <span>
              We use your address to connect you with nearby neighbors.
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-start gap-3 text-[14.5px] leading-[1.45] text-ink-link">
              <input
                type="checkbox"
                checked={fields.terms}
                onChange={(e) => set("terms")(e.target.checked)}
                aria-invalid={Boolean(errors.terms)}
                className="m-0 size-[22px] flex-none cursor-pointer accent-primary"
              />
              <span>
                I accept the{" "}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="font-bold text-primary"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="font-bold text-primary"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {errors.terms ? (
              <FieldErrorText>{errors.terms}</FieldErrorText>
            ) : null}
          </div>
          <FormNotice error={formError} notice={flows.notice} />
          {/* Clerk renders its bot-protection challenge here when enabled. */}
          <div id="clerk-captcha" />
          <SubmitButton pending={pending}>Create account</SubmitButton>
          <p className="m-0 text-center text-[15px] text-ink-muted">
            Already have an account?{" "}
            <InlineSwitch onClick={() => switchMode("signin")}>
              Sign in
            </InlineSwitch>
          </p>
        </form>
      )}
    </Dialog>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-11 rounded-full border-none text-[15px] transition-[background] duration-150",
        active
          ? "bg-primary font-bold text-white"
          : "bg-transparent font-semibold text-forest",
      )}
    >
      {children}
    </button>
  );
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[54px] rounded-full border-none bg-primary text-[16.5px] font-bold text-white shadow-cta hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

/** Form-level error from Clerk, or a short confirmation. */
function FormNotice({
  error,
  notice,
}: {
  error: string | null;
  notice: string | null;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="rounded-field bg-danger-bg px-3.5 py-3 text-sm font-semibold text-danger"
      >
        {error}
      </div>
    );
  }
  if (notice) {
    return (
      <div
        role="status"
        className="rounded-field bg-success-bg px-3.5 py-3 text-sm font-semibold text-success-ink"
      >
        {notice}
      </div>
    );
  }
  return null;
}

function InlineSwitch({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-none bg-transparent p-0 text-[15px] font-bold text-primary"
    >
      {children}
    </button>
  );
}

function FieldErrorText({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <span id={id} className="text-[13px] font-semibold text-danger">
      {children}
    </span>
  );
}

function PasswordToggle({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      className="absolute top-[3px] right-1 flex size-11 items-center justify-center border-none bg-transparent text-ink-soft"
    >
      <Icon name="eye" size={19} strokeWidth={1.8} />
    </button>
  );
}

type AuthFieldProps = {
  label: string;
  icon: IconName;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "email" | "text";
  placeholder?: string;
  trailing?: ReactNode;
};

function AuthField({
  label,
  icon,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  trailing,
}: AuthFieldProps) {
  const errorId = useId();
  return (
    <label className="flex min-w-0 flex-col gap-2 text-[14.5px] font-bold">
      {label}
      <div className="relative">
        <Icon
          name={icon}
          size={18}
          strokeWidth={1.8}
          className="pointer-events-none absolute top-1/2 left-[15px] -mt-[9px] text-ink-soft"
        />
        <input
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "box-border h-[50px] w-full rounded-field border border-solid bg-white pl-11 font-sans text-[15.5px] font-normal text-forest outline-none focus:border-primary focus:shadow-focus",
            trailing ? "pr-12" : "pr-3.5",
            error ? "border-danger-border" : "border-[rgba(47,70,54,.16)]",
          )}
        />
        {trailing}
      </div>
      {error ? <FieldErrorText id={errorId}>{error}</FieldErrorText> : null}
    </label>
  );
}
