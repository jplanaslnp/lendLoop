import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { siteConfig } from "@/config/site";
import { ROUTES } from "@/config/navigation";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProfileSync } from "@/features/auth/ProfileSync";
import { AUTH_QUERY, SIGN_IN_GATE_VALUE } from "@/features/auth/returnTo";
import { ConvexClientProvider } from "@/lib/convex/ConvexClientProvider";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export const viewport: Viewport = {
  themeColor: "#E8F0E2",
  viewportFit: "cover",
};

/** Clerk's own redirects open the LendLoop modal instead of a Clerk page. */
const SIGN_IN_URL = `${ROUTES.explore}?${AUTH_QUERY.open}=${SIGN_IN_GATE_VALUE}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} antialiased`}>
      <body className="min-h-screen bg-sage font-sans text-forest">
        {/* Keys come from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY. */}
        <ClerkProvider
          signInUrl={SIGN_IN_URL}
          signUpUrl={SIGN_IN_URL}
          afterSignOutUrl={ROUTES.explore}
        >
          <ConvexClientProvider>
            <ProfileSync />
            <AuthProvider>{children}</AuthProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
