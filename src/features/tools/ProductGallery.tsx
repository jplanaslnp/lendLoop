"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ToolImage } from "@/components/ui/ToolImage";
import { cn } from "@/lib/cn";
import type { ToolPhoto } from "@/features/listings/types";

/** Hero photo with previous/next controls, counter and thumbnails. */
export function ProductGallery({
  photos,
  name,
}: {
  photos: readonly ToolPhoto[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-image shadow-hero md:aspect-[16/9.6] md:rounded-panel">
        <ToolImage
          photo={photos[index]}
          alt={name}
          sizes="(min-width: 960px) 60vw, 100vw"
          priority={index === 0}
          placeholderIconSize={40}
        />
        {count > 1 ? (
          <>
            <GalleryButton
              side="left"
              label="Previous photo"
              onClick={() => go(-1)}
            />
            <GalleryButton
              side="right"
              label="Next photo"
              onClick={() => go(1)}
            />
          </>
        ) : null}
        <span
          className="pointer-events-none absolute right-3.5 bottom-3.5 flex h-7 items-center rounded-full bg-[rgba(47,70,54,.72)] px-3 text-[13px] font-semibold text-white"
          aria-live="polite"
        >
          {index + 1} / {count}
        </span>
      </div>
      {count > 1 ? (
        <div className="grid grid-cols-[repeat(3,76px)] gap-2.5 md:grid-cols-[repeat(3,108px)]">
          {photos.map((photo, i) => (
            <button
              key={`${photo.label}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={photo.label}
              aria-pressed={i === index}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-field border-2 border-solid bg-image p-0 transition-[opacity,border-color] duration-150",
                i === index
                  ? "border-primary opacity-100"
                  : "border-transparent opacity-[.72]",
              )}
            >
              {photo.kind === "image" ? (
                <span
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.src})` }}
                />
              ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-placeholder-ink">
                  <Icon name="image" size={16} strokeWidth={1.5} />
                  {photo.label}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GalleryButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 -mt-[22px] flex size-11 items-center justify-center rounded-full border-none bg-[rgba(250,251,248,.94)] text-forest shadow-gallery-btn hover:bg-white",
        side === "left" ? "left-3.5" : "right-3.5",
      )}
    >
      <Icon
        name={side === "left" ? "chevronLeft" : "chevronRight"}
        size={20}
        strokeWidth={2.2}
      />
    </button>
  );
}
