"use client";

import { Icon } from "@/components/ui/Icon";
import { AvailabilityOverlayBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/features/auth/UserAvatar";
import { useCurrentUser } from "@/features/auth/useCurrentUser";
import { cn } from "@/lib/cn";
import { MOCK_CURRENT_USER } from "@/mocks/people";

type PreviewProps = {
  name: string;
  description: string;
  mainPhoto: string | null;
  variant: "side" | "inline";
};

const SIZES = {
  side: {
    card: "rounded-card shadow-[0_1px_2px_rgba(47,70,54,.04),0_14px_32px_-14px_rgba(47,70,54,.2)]",
    badge: "top-3 right-3 h-8 text-sm",
    placeholderIcon: 40,
    placeholderStroke: 1.4,
    placeholderText: "text-sm",
    placeholderLabel: "Your main photo appears here",
    body: "px-5 py-[18px]",
    name: "text-xl",
    desc: "text-[15px]",
    divider: "my-4",
    avatar: 30,
    meta: "text-[15px]",
  },
  inline: {
    card: "rounded-2xl shadow-[0_1px_2px_rgba(47,70,54,.04),0_10px_28px_-12px_rgba(47,70,54,.18)]",
    badge: "top-2.5 left-2.5 h-[26px] text-xs",
    placeholderIcon: 34,
    placeholderStroke: 1.5,
    placeholderText: "text-[13px]",
    placeholderLabel: "Main photo",
    body: "px-4 py-3.5",
    name: "text-[17px]",
    desc: "text-sm",
    divider: "my-3",
    avatar: 26,
    meta: "text-[13.5px]",
  },
} as const;

/** "This is how your item will appear in Explore" card. */
export function ListingPreviewCard({
  name,
  description,
  mainPhoto,
  variant,
}: PreviewProps) {
  const user = useCurrentUser();
  const s = SIZES[variant];
  const hasName = name.trim().length > 0;
  const hasDesc = description.trim().length > 0;
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden border border-solid border-[rgba(47,70,54,.08)] bg-surface",
        s.card,
      )}
    >
      <div
        className="relative flex aspect-[4/3] items-center justify-center bg-image bg-cover bg-center"
        style={mainPhoto ? { backgroundImage: `url(${mainPhoto})` } : undefined}
      >
        {mainPhoto ? null : (
          <div className="flex flex-col items-center gap-2 text-placeholder-ink">
            <Icon
              name="image"
              size={s.placeholderIcon}
              strokeWidth={s.placeholderStroke}
            />
            <span className={cn("font-semibold", s.placeholderText)}>
              {s.placeholderLabel}
            </span>
          </div>
        )}
        <AvailabilityOverlayBadge
          availability="available"
          blur={false}
          className={s.badge}
        />
      </div>
      <div className={cn("flex flex-col", s.body)}>
        <h3
          className={cn(
            "m-0 leading-[1.25] font-bold tracking-tight [overflow-wrap:anywhere]",
            s.name,
            hasName ? "text-forest" : "text-ink-disabled",
          )}
        >
          {hasName ? name.trim() : "Item name"}
        </h3>
        <p
          className={cn(
            "mt-1.5 mb-0 line-clamp-2 min-h-[2.9em] leading-[1.45] [overflow-wrap:anywhere]",
            s.desc,
            hasDesc ? "text-ink-soft" : "text-ink-disabled",
          )}
        >
          {hasDesc
            ? description.trim()
            : "A short description of your item will appear here."}
        </p>
        <div className={cn("h-px bg-[rgba(47,70,54,.1)]", s.divider)} />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar user={user} size={s.avatar} />
            <span
              className={cn(
                "font-medium whitespace-nowrap text-forest",
                s.meta,
              )}
            >
              {user?.shortName}
            </span>
          </div>
          <span
            className={cn(
              "flex flex-none items-center gap-1.5 font-semibold text-forest",
              s.meta,
            )}
          >
            <span className="size-1 rounded-full bg-forest" aria-hidden />
            {MOCK_CURRENT_USER.building}
          </span>
        </div>
      </div>
    </article>
  );
}

const TIPS = [
  "Your item will be visible to neighbors once published.",
  "You approve every request from the Lending section.",
  "You can edit or remove the listing anytime.",
];

export function GoodToKnow({ variant }: { variant: "side" | "inline" }) {
  const side = variant === "side";
  return (
    <div
      className={cn(
        "border border-solid border-[rgba(112,64,160,.1)] bg-lavender-soft",
        side ? "rounded-card px-[22px] py-5" : "rounded-2xl px-[18px] py-4",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 font-extrabold text-primary-deep",
          side ? "text-lg" : "text-base",
        )}
      >
        <Icon name="info" size={side ? 22 : 20} />
        Good to know
      </div>
      <ul
        className={cn(
          "m-0 flex list-none flex-col p-0",
          side ? "mt-3.5 gap-3" : "mt-3 gap-2.5",
        )}
      >
        {TIPS.map((tip) => (
          <li
            key={tip}
            className={cn(
              "grid grid-cols-[20px_1fr] leading-[1.45] text-forest",
              side ? "gap-3 text-[15px]" : "gap-2.5 text-sm",
            )}
          >
            <Icon
              name="check"
              size={side ? 19 : 18}
              strokeWidth={2.4}
              className="mt-px text-primary"
            />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
