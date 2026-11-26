"use client";

import { HandleSSOCallback } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { ROUTES } from "@/config/navigation";

import { AUTH_QUERY, safeReturnTo, signInGateUrl } from "./returnTo";

/**
 * Finishes a Google sign-in. Clerk sends the visitor on to the `redirectUrl`
 * the modal chose (the page and intended action they started from).
 */
export function SsoCallback() {
  const router = useRouter();
  const backToSignIn = () => router.replace(signInGateUrl(ROUTES.explore));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sage px-6 text-center">
      <Logo variant="compact" asLink={false} />
      <p role="status" className="m-0 text-[15.5px] text-ink-muted">
        Signing you in…
      </p>
      {/* Clerk's bot-protection challenge, if one is required. */}
      <div id="clerk-captcha" />
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => {
          // Back to the page the visitor started from (same-site paths only).
          const params = new URLSearchParams(window.location.search);
          const target =
            safeReturnTo(params.get(AUTH_QUERY.redirect)) ?? ROUTES.explore;
          const url = decorateUrl(target);
          if (url.startsWith("http")) window.location.href = url;
          else router.replace(url);
        }}
        navigateToSignIn={backToSignIn}
        navigateToSignUp={backToSignIn}
      />
    </main>
  );
}
