/**
 * Where to send someone after they sign in. Only same-origin relative paths
 * are accepted, so a crafted `redirect_url` can never bounce a user to
 * another site (open redirect).
 */

/** Query keys used by the sign-in gate (see proxy.ts). */
export const AUTH_QUERY = {
  /** `?auth=sign-in` opens the sign-in modal on page load. */
  open: "auth",
  /** Path to continue to after a successful sign-in. */
  redirect: "redirect_url",
} as const;

export const SIGN_IN_GATE_VALUE = "sign-in";

export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Must be a path on this site: "/x", never "//host", "/\host" or "http:".
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\")) return null;
  // Reject control characters (e.g. "/\tevil.com" tricks).
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed.charCodeAt(i) < 0x20 || trimmed.charCodeAt(i) === 0x7f) {
      return null;
    }
  }
  try {
    const base = "https://lendloop.invalid";
    const url = new URL(trimmed, base);
    if (url.origin !== base) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** The Explore URL that opens the sign-in modal, then continues to `path`. */
export function signInGateUrl(path: string): string {
  const params = new URLSearchParams({
    [AUTH_QUERY.open]: SIGN_IN_GATE_VALUE,
    [AUTH_QUERY.redirect]: path,
  });
  return `/explore?${params.toString()}`;
}
