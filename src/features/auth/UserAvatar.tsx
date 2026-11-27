"use client";

import { PersonAvatar } from "@/components/ui/PersonAvatar";

import type { CurrentUser } from "./useCurrentUser";

/**
 * The signed-in person's Clerk profile image, with a neutral initial while
 * Clerk loads or when there is no image.
 */
export function UserAvatar({
  user,
  ...props
}: {
  user: CurrentUser | null;
  size: number;
  alt?: string;
  fluid?: boolean;
  priority?: boolean;
  className?: string;
}) {
  return (
    <PersonAvatar
      name={user?.fullName ?? ""}
      imageUrl={user?.imageUrl}
      {...props}
    />
  );
}
