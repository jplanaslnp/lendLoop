"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import type { SetActiveNavigate } from "@clerk/nextjs/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
} from "react";

import { ROUTES } from "@/config/navigation";

import { AuthModal, type AuthMode } from "./AuthModal";
import { AUTH_QUERY, safeReturnTo, SIGN_IN_GATE_VALUE } from "./returnTo";

/**
 * App-wide sign-in state and the LendLoop sign-in modal, backed by Clerk.
 *
 * Clerk owns the session (HTTP-only cookies, refreshed by Clerk); this
 * provider only decides *when* to show the modal and *where* to continue
 * afterwards. UI state here is never a security boundary: pages are gated in
 * proxy.ts and private data will be authorised in Convex.
 */

type AuthIntent =
  | { kind: "navigate"; href: string }
  /**
   * Run an action on this page after sign-in. `resumeHref` is used when the
   * sign-in leaves the page (Google redirect): the page reads it on load and
   * resumes the action from the URL.
   */
  | { kind: "run"; run: () => void; resumeHref: string };

type OpenAuthOptions = {
  mode?: AuthMode;
  intent?: AuthIntent;
  /** Protected page: closing the modal while signed out leaves the page. */
  gate?: boolean;
};

type AuthUi = {
  /** False until Clerk has loaded the session in the browser. */
  isLoaded: boolean;
  isSignedIn: boolean;
  /** True while a sign-out is in progress (pages shouldn't re-gate). */
  isSigningOut: boolean;
  openAuth: (options?: OpenAuthOptions) => void;
  signOut: () => Promise<void>;
  /** onClick for links to protected pages: opens sign-in when signed out. */
  guardLink: (href: string) => (event: MouseEvent<HTMLElement>) => void;
  /**
   * Runs `action` now when signed in, or after sign-in. `resumeHref` is the
   * URL that restores the action after a full-page sign-in (Google).
   */
  requireAuth: (action: () => void, resumeHref?: string) => void;
};

const AuthUiContext = createContext<AuthUi | null>(null);

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const clerk = useClerk();
  const { isLoaded, isSignedIn: clerkSignedIn } = useAuth();
  const isSignedIn = Boolean(isLoaded && clerkSignedIn);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: AuthMode;
    gate: boolean;
    /** Remounts the modal on each open so its form state starts fresh. */
    key: number;
  }>({ open: false, mode: "signin", gate: false, key: 0 });
  const intentRef = useRef<AuthIntent | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const openAuth = useCallback((options: OpenAuthOptions = {}) => {
    intentRef.current = options.intent ?? null;
    setIsSigningOut(false);
    setModal((m) => ({
      open: true,
      mode: options.mode ?? "signin",
      gate: options.gate ?? false,
      key: m.key + 1,
    }));
  }, []);

  const close = useCallback(() => {
    const wasGate = modal.gate;
    intentRef.current = null;
    setModal((m) => ({ ...m, open: false, gate: false }));
    if (wasGate && !isSignedIn) router.push(ROUTES.explore);
  }, [modal.gate, isSignedIn, router]);

  /** Where a full-page (Google) sign-in should come back to. */
  const returnHref = useCallback((): string => {
    const intent = intentRef.current;
    if (intent?.kind === "navigate") return intent.href;
    if (intent?.kind === "run") return intent.resumeHref;
    return currentPath();
  }, []);

  /** Called by Clerk once the new session is active (email/password flows). */
  const navigateAfterAuth = useCallback<SetActiveNavigate>(
    ({ decorateUrl }) => {
      const intent = intentRef.current;
      const target = returnHref();
      intentRef.current = null;
      setModal((m) => ({ ...m, open: false, gate: false }));

      const url = decorateUrl(target);
      if (url.startsWith("http")) {
        // Clerk needs a full navigation (e.g. Safari cookie refresh).
        window.location.href = url;
        return;
      }
      if (intent?.kind === "navigate") router.push(url);
      else if (intent?.kind === "run") setTimeout(intent.run, 60);
    },
    [returnHref, router],
  );

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await clerk.signOut({ redirectUrl: ROUTES.explore });
    } catch {
      setIsSigningOut(false);
    }
    // On success the flag stays set until the next sign-in, so the page being
    // left doesn't flash the sign-in gate before the redirect lands.
  }, [clerk]);

  /**
   * True once Clerk's browser script has loaded and confirmed the session.
   * `isLoaded` alone can come from the server render, which reports a member
   * whose short-lived session token expired as signed out until the browser
   * refreshes it (about half a second). Only `requireAuth` and `guardLink`
   * use this, so a click in that window isn't treated as a guest's.
   */
  const sessionConfirmed = useSyncExternalStore(
    useCallback((onChange: () => void) => clerk.addListener(onChange), [clerk]),
    () => clerk.loaded,
    () => false,
  );
  const ready = isLoaded && sessionConfirmed;

  const guardLink = useCallback(
    (href: string) => (event: MouseEvent<HTMLElement>) => {
      // Until Clerk has confirmed the session, let the link through: proxy.ts
      // still gates account pages, and a signed-in member isn't sent to the
      // sign-in form.
      if (isSignedIn || !ready) return;
      event.preventDefault();
      openAuth({ intent: { kind: "navigate", href } });
    },
    [ready, isSignedIn, openAuth],
  );

  /** An action requested before Clerk confirmed the session. */
  const pendingRef = useRef<{
    action: () => void;
    resumeHref?: string;
  } | null>(null);

  const runOrAskSignIn = useCallback(
    (signedIn: boolean, action: () => void, resumeHref?: string) => {
      if (signedIn) action();
      else
        openAuth({
          intent: {
            kind: "run",
            run: action,
            resumeHref: safeReturnTo(resumeHref) ?? currentPath(),
          },
        });
    },
    [openAuth],
  );

  const requireAuth = useCallback(
    (action: () => void, resumeHref?: string) => {
      // Before Clerk confirms the session, a signed-in member would wrongly
      // get the sign-in form: wait for it, then decide.
      if (!ready) {
        pendingRef.current = { action, resumeHref };
        return;
      }
      runOrAskSignIn(isSignedIn, action, resumeHref);
    },
    [ready, isSignedIn, runOrAskSignIn],
  );

  useEffect(() => {
    const pending = pendingRef.current;
    if (!ready || !pending) return;
    pendingRef.current = null;
    runOrAskSignIn(isSignedIn, pending.action, pending.resumeHref);
  }, [ready, isSignedIn, runOrAskSignIn]);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn,
      isSigningOut,
      openAuth,
      signOut,
      guardLink,
      requireAuth,
    }),
    [
      isLoaded,
      isSignedIn,
      isSigningOut,
      openAuth,
      signOut,
      guardLink,
      requireAuth,
    ],
  );

  return (
    <AuthUiContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <SignInGate
          isLoaded={isLoaded}
          isSignedIn={isSignedIn}
          openAuth={openAuth}
        />
      </Suspense>
      <AuthModal
        key={modal.key}
        open={modal.open}
        initialMode={modal.mode}
        onClose={close}
        getReturnHref={returnHref}
        navigateAfterAuth={navigateAfterAuth}
      />
    </AuthUiContext.Provider>
  );
}

/**
 * Handles `/explore?auth=sign-in&redirect_url=/x` (set by proxy.ts when a
 * signed-out visitor opens an account page): opens the modal and continues
 * to the original page after sign-in.
 */
function SignInGate({
  isLoaded,
  isSignedIn,
  openAuth,
}: {
  isLoaded: boolean;
  isSignedIn: boolean;
  openAuth: (options?: OpenAuthOptions) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const gate = params.get(AUTH_QUERY.open);
  const redirect = params.get(AUTH_QUERY.redirect);

  useEffect(() => {
    if (gate !== SIGN_IN_GATE_VALUE || !isLoaded) return;
    const href = safeReturnTo(redirect);
    // Drop the gate parameters so a reload doesn't reopen the modal.
    router.replace(pathname, { scroll: false });
    if (isSignedIn) {
      if (href) router.replace(href);
      return;
    }
    openAuth(href ? { intent: { kind: "navigate", href } } : {});
  }, [gate, redirect, isLoaded, isSignedIn, openAuth, pathname, router]);

  return null;
}

export function useAuthUi(): AuthUi {
  const ctx = useContext(AuthUiContext);
  if (!ctx) {
    throw new Error("useAuthUi must be used inside AuthProvider");
  }
  return ctx;
}
