"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { AuthModal, type AuthMode } from "./AuthModal";

/**
 * PHASE 2 UI MOCK — not authentication.
 *
 * Holds a signed-in/signed-out flag in React memory only so the approved
 * logged-out and logged-in designs can be reviewed. Nothing is persisted
 * (no localStorage/cookies), nothing is verified, and a full page reload
 * signs the mock user out. Replaced by Clerk in Phase 3.
 */

type AuthIntent =
  { kind: "navigate"; href: string } | { kind: "run"; run: () => void };

type OpenAuthOptions = {
  mode?: AuthMode;
  intent?: AuthIntent;
  /** Protected page: closing the modal while signed out leaves the page. */
  gate?: boolean;
};

type MockSession = {
  isSignedIn: boolean;
  openAuth: (options?: OpenAuthOptions) => void;
  signOut: () => void;
  /** onClick for links to protected pages: opens sign-in when signed out. */
  guardLink: (href: string) => (event: MouseEvent<HTMLElement>) => void;
  /** Runs `action` now, or after a successful mock sign-in. */
  requireAuth: (action: () => void) => void;
};

const MockSessionContext = createContext<MockSession | null>(null);

export function MockSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: AuthMode;
    gate: boolean;
    /** Remounts the modal on each open so its form state starts fresh. */
    key: number;
  }>({ open: false, mode: "signin", gate: false, key: 0 });
  const intentRef = useRef<AuthIntent | null>(null);

  const openAuth = useCallback((options: OpenAuthOptions = {}) => {
    intentRef.current = options.intent ?? null;
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
    if (wasGate && !isSignedIn) router.push("/explore");
  }, [modal.gate, isSignedIn, router]);

  const succeed = useCallback(() => {
    const intent = intentRef.current;
    intentRef.current = null;
    setIsSignedIn(true);
    setModal((m) => ({ ...m, open: false, gate: false }));
    if (intent?.kind === "navigate") router.push(intent.href);
    else if (intent?.kind === "run") setTimeout(intent.run, 60);
  }, [router]);

  const signOut = useCallback(() => setIsSignedIn(false), []);

  const guardLink = useCallback(
    (href: string) => (event: MouseEvent<HTMLElement>) => {
      if (isSignedIn) return;
      event.preventDefault();
      openAuth({ intent: { kind: "navigate", href } });
    },
    [isSignedIn, openAuth],
  );

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isSignedIn) action();
      else openAuth({ intent: { kind: "run", run: action } });
    },
    [isSignedIn, openAuth],
  );

  const value = useMemo(
    () => ({ isSignedIn, openAuth, signOut, guardLink, requireAuth }),
    [isSignedIn, openAuth, signOut, guardLink, requireAuth],
  );

  return (
    <MockSessionContext.Provider value={value}>
      {children}
      <AuthModal
        key={modal.key}
        open={modal.open}
        initialMode={modal.mode}
        onClose={close}
        onSuccess={succeed}
      />
    </MockSessionContext.Provider>
  );
}

export function useMockSession(): MockSession {
  const ctx = useContext(MockSessionContext);
  if (!ctx) {
    throw new Error("useMockSession must be used inside MockSessionProvider");
  }
  return ctx;
}
