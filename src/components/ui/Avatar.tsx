import Image from "next/image";

import { cn } from "@/lib/cn";

type AvatarProps = {
  src: string;
  /** Empty string for decorative avatars next to a visible name. */
  alt: string;
  /** Intrinsic size in px; also the rendered size unless `fluid`. */
  size: number;
  /** Fill the parent instead (parent controls responsive size). */
  fluid?: boolean;
  className?: string;
  priority?: boolean;
};

export function Avatar({
  src,
  alt,
  size,
  fluid,
  className,
  priority,
}: AvatarProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn(
        "flex-none rounded-full object-cover",
        fluid && "size-full",
        className,
      )}
      style={fluid ? undefined : { width: size, height: size }}
    />
  );
}
