"use client";

import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/Icon";
import { ROUTES, type NavKey } from "@/config/navigation";
import { useMockSession } from "@/features/auth/MockSessionProvider";
import { cn } from "@/lib/cn";

const ITEMS: {
  key: NavKey;
  label: string;
  href: string;
  icon: IconName;
  activeIcon?: IconName;
  dot: boolean;
}[] = [
  {
    key: "explore",
    label: "Explore",
    href: ROUTES.explore,
    icon: "home",
    dot: false,
  },
  {
    key: "borrowing",
    label: "Borrowing",
    href: ROUTES.borrowing,
    icon: "borrow",
    dot: true,
  },
  {
    key: "lending",
    label: "Lending",
    href: ROUTES.lending,
    icon: "lend",
    dot: true,
  },
  {
    key: "share",
    label: "Share",
    href: ROUTES.share,
    icon: "shareSquare",
    dot: false,
  },
  {
    key: "profile",
    label: "Profile",
    href: ROUTES.profile,
    icon: "user",
    activeIcon: "userFilled",
    dot: false,
  },
];

/** Fixed mobile (<760px) tab bar for authenticated app pages. */
export function MobileBottomNav({ active }: { active?: NavKey }) {
  const { guardLink } = useMockSession();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-solid border-[rgba(47,70,54,.08)] bg-[rgba(250,251,248,.96)] px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-[14px] md:hidden"
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={item.key === "explore" ? undefined : guardLink(item.href)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 flex-col items-center gap-[3px] py-1.5 text-xs",
              isActive
                ? "font-bold text-primary hover:text-primary"
                : "font-medium text-forest hover:text-forest",
            )}
          >
            <Icon
              name={isActive && item.activeIcon ? item.activeIcon : item.icon}
              size={24}
              strokeWidth={isActive ? (item.activeIcon ? 1.7 : 2.2) : 1.7}
            />
            {item.label}
            {item.dot ? (
              <span
                className="absolute top-1 left-[calc(50%+9px)] size-[7px] rounded-full bg-primary"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
