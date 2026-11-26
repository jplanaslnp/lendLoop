"use client";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

import type { CurrentUser } from "./useCurrentUser";

/**
 * The signed-in person's Clerk profile image, with a neutral initial while
 * Clerk loads or when there is no image.
 */
export function UserAvatar({
  user,
  size,
  alt = "",
  fluid,
  priority,
  className,
}: {
  user: CurrentUser | null;
  size: number;
  alt?: string;
  fluid?: boolean;
  priority?: boolean;
  className?: string;
}) {
  if (user?.imageUrl) {
    return (
      <Avatar
        src={user.imageUrl}
        alt={alt}
        size={size}
        fluid={fluid}
        priority={priority}
        className={className}
      />
    );
  }
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn(
        "flex flex-none items-center justify-center rounded-full bg-lavender font-bold text-primary-deep",
        fluid && "size-full",
        className,
      )}
      style={
        fluid
          ? { fontSize: size * 0.4 }
          : { width: size, height: size, fontSize: size * 0.4 }
      }
    >
      {user?.fullName.charAt(0).toUpperCase() ?? ""}
    </span>
  );
}
