import Image from "next/image";

import { cn } from "@/lib/cn";
import type { ToolPhoto } from "@/features/listings/types";

import { Icon } from "./Icon";

/**
 * Fills its (relatively positioned) parent with a tool photo, or with the
 * design's neutral photo placeholder when the listing has no image yet.
 */
export function ToolImage({
  photo,
  alt,
  sizes,
  priority,
  placeholderIconSize = 34,
  className,
}: {
  photo: ToolPhoto | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  placeholderIconSize?: number;
  className?: string;
}) {
  if (!photo || photo.kind === "placeholder") {
    return (
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-image text-placeholder-ink",
          className,
        )}
        role="img"
        aria-label={`${alt} — no photo yet`}
      >
        <Icon name="image" size={placeholderIconSize} strokeWidth={1.5} />
        <span className="text-[13px] font-semibold">
          {photo?.label ?? "Main photo"}
        </span>
      </div>
    );
  }
  return (
    <Image
      src={photo.src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
