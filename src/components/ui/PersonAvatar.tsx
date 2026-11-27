import { cn } from "@/lib/cn";

import { Avatar } from "./Avatar";

/** A person's photo, or a neutral lavender initial when there is none. */
export function PersonAvatar({
  name,
  imageUrl,
  size,
  alt = "",
  fluid,
  priority,
  className,
}: {
  name: string;
  imageUrl: string | null | undefined;
  size: number;
  alt?: string;
  fluid?: boolean;
  priority?: boolean;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <Avatar
        src={imageUrl}
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
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
