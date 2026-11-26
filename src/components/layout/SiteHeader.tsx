"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { ROUTES, type NavKey } from "@/config/navigation";
import { useAuthUi } from "@/features/auth/AuthProvider";
import { UserAvatar } from "@/features/auth/UserAvatar";
import { useCurrentUser } from "@/features/auth/useCurrentUser";
import { cn } from "@/lib/cn";

import { Logo } from "./Logo";

/** Small purple notification dot used on Borrowing/Lending (mock). */
function NavDot({ className }: { className: string }) {
  return (
    <span
      className={cn("absolute size-[7px] rounded-full bg-primary", className)}
      aria-hidden
    />
  );
}

const DESKTOP_TABS: {
  key: NavKey;
  label: string;
  href: string;
  dot: boolean;
}[] = [
  { key: "explore", label: "Explore", href: ROUTES.explore, dot: false },
  { key: "borrowing", label: "Borrowing", href: ROUTES.borrowing, dot: true },
  { key: "lending", label: "Lending", href: ROUTES.lending, dot: true },
];

/** Desktop (≥760px) sticky header with centred tab navigation. */
export function DesktopHeader({ active }: { active?: NavKey }) {
  const { isLoaded, isSignedIn, guardLink, openAuth } = useAuthUi();
  const user = useCurrentUser();
  return (
    <header className="sticky top-0 z-20 hidden border-b border-solid border-[rgba(47,70,54,.07)] bg-[rgba(246,249,243,.86)] backdrop-blur-[14px] backdrop-saturate-[1.4] md:block">
      <div className="mx-auto box-border grid h-[68px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 xl:px-14">
        <Logo variant="header" />
        <nav aria-label="Main" className="flex h-[68px] items-stretch gap-2">
          {DESKTOP_TABS.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={
                  tab.key === "explore" ? undefined : guardLink(tab.href)
                }
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center border-b-[3px] border-solid px-3 pt-[3px] text-base whitespace-nowrap xl:px-5",
                  isActive
                    ? "border-primary font-bold text-primary hover:text-primary"
                    : "border-transparent font-medium text-forest hover:text-primary",
                )}
              >
                {tab.label}
                {tab.dot ? <NavDot className="top-[18px] right-2.5" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-end gap-4">
          <Link
            href={ROUTES.share}
            onClick={guardLink(ROUTES.share)}
            className="flex h-11 flex-none items-center gap-2 rounded-full bg-primary px-[22px] text-[15px] font-semibold whitespace-nowrap text-white shadow-primary hover:bg-primary-hover hover:text-white"
          >
            <Icon name="plus" size={18} className="flex-none" />
            Share a tool
          </Link>
          {isSignedIn ? (
            <Link
              href={ROUTES.profile}
              className={cn(
                "flex items-center gap-1.5 text-forest hover:text-forest",
                active === "profile" &&
                  "box-border h-[68px] border-b-[3px] border-solid border-primary pt-[3px]",
              )}
              aria-label="My profile"
              aria-current={active === "profile" ? "page" : undefined}
            >
              <UserAvatar
                user={user}
                size={40}
                className={cn(
                  "box-content border-2 border-solid shadow-avatar",
                  active === "profile" ? "border-primary" : "border-surface",
                )}
              />
              <Icon name="chevronDown" size={16} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openAuth()}
              // Hidden (space kept) until Clerk knows whether you're signed in.
              aria-hidden={!isLoaded || undefined}
              tabIndex={isLoaded ? undefined : -1}
              className={cn(
                "flex h-11 flex-none items-center gap-2 rounded-full border-[1.5px] border-solid border-primary bg-surface px-5 text-[15px] font-bold whitespace-nowrap text-primary hover:bg-lavender-soft",
                !isLoaded && "invisible",
              )}
            >
              <Icon name="user" size={18} />
              Login / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function BellButton() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="relative flex size-11 items-center justify-center border-none bg-transparent text-forest"
    >
      <Icon name="bell" size={22} strokeWidth={1.7} />
      <span
        className="absolute top-[9px] right-2.5 box-content size-[7px] rounded-full border-[1.5px] border-solid border-header bg-primary"
        aria-hidden
      />
    </button>
  );
}

/**
 * Mobile (<760px) brand header: logo, notifications and (optionally) the
 * account avatar / "Log in" button.
 */
export function MobileBrandHeader({
  showAccount = true,
  className,
}: {
  showAccount?: boolean;
  className?: string;
}) {
  const { isLoaded, isSignedIn, openAuth } = useAuthUi();
  const user = useCurrentUser();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-solid border-[rgba(47,70,54,.06)] bg-[rgba(246,249,243,.9)] backdrop-blur-[14px] md:hidden",
        className,
      )}
    >
      <div className="flex h-[60px] items-center justify-between px-[18px]">
        <Logo variant="compact" />
        <div className="flex items-center gap-3.5">
          <BellButton />
          {showAccount ? (
            isSignedIn ? (
              <Link href={ROUTES.profile} aria-label="My profile">
                <UserAvatar
                  user={user}
                  size={36}
                  className="box-content border-2 border-solid border-surface shadow-avatar"
                />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuth()}
                aria-hidden={!isLoaded || undefined}
                tabIndex={isLoaded ? undefined : -1}
                className={cn(
                  "h-10 rounded-full border-[1.5px] border-solid border-primary bg-surface px-4 text-sm font-bold whitespace-nowrap text-primary",
                  !isLoaded && "invisible",
                )}
              >
                Log in
              </button>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function CircleIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full border border-solid border-[rgba(47,70,54,.08)] bg-surface text-forest shadow-icon-btn"
    >
      {children}
    </button>
  );
}

/** Mobile header with a back button, a centred title/logo and a right slot. */
export function MobileBackHeader({
  onBack,
  center,
  right,
  className,
}: {
  onBack: () => void;
  center: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-solid border-[rgba(47,70,54,.06)] bg-[rgba(246,249,243,.92)] backdrop-blur-[14px] md:hidden",
        className,
      )}
    >
      <div className="grid h-[60px] grid-cols-[44px_1fr_44px] items-center px-3">
        <CircleIconButton label="Back" onClick={onBack}>
          <Icon name="chevronLeft" size={20} />
        </CircleIconButton>
        <div className="flex justify-center">{center}</div>
        {right ?? <span />}
      </div>
    </header>
  );
}
