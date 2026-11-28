"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Id } from "@convex/_generated/dataModel";
import { PHOTOS_MAX } from "@convex/lib/listingRules";

/**
 * A photo in the form: a new local file (`file`, previewed from an object
 * URL) and/or an upload already stored in Convex (`uploadId`).
 */
export type LocalPhoto = {
  id: string;
  src: string;
  file?: File;
  uploadId?: Id<"uploads">;
};

export const MAX_PHOTOS = PHOTOS_MAX;

type PhotoPickerProps = {
  photos: readonly LocalPhoto[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  hasError: boolean;
  isMobile: boolean;
};

/**
 * Photo picker (drag & drop, reorder, remove). New files are previewed
 * locally and uploaded to Convex when the listing is published or saved.
 */
export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  onMove,
  hasError,
  isMobile,
}: PhotoPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [zoneOver, setZoneOver] = useState(false);
  const left = MAX_PHOTOS - photos.length;

  const openPicker = () => fileRef.current?.click();
  const onZoneKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  };
  const onZoneOver = (event: DragEvent) => {
    event.preventDefault();
    if (dragIndex === null && !zoneOver) setZoneOver(true);
  };
  const onZoneDrop = (event: DragEvent) => {
    event.preventDefault();
    if (dragIndex === null) onAdd(Array.from(event.dataTransfer.files));
    setZoneOver(false);
    setDragIndex(null);
  };

  const zoneBorder = zoneOver
    ? "border-primary"
    : hasError
      ? "border-danger-border"
      : "border-lilac-soft";
  const zoneBg = zoneOver ? "bg-lavender-soft" : "bg-lavender-faint";

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          onAdd(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {photos.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Add photos"
          onClick={openPicker}
          onKeyDown={onZoneKey}
          onDragOver={onZoneOver}
          onDragLeave={() => setZoneOver(false)}
          onDrop={onZoneDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-[18px] py-7 text-center transition-[background,border-color] duration-150 outline-none hover:border-lilac hover:bg-lavender-soft focus:border-primary md:px-6 md:py-10",
            zoneBorder,
            zoneBg,
          )}
        >
          <div className="flex size-[60px] items-center justify-center rounded-full bg-lavender">
            <Icon
              name="cloudUpload"
              size={28}
              strokeWidth={1.8}
              className="text-primary"
            />
          </div>
          <div className="text-[16.5px] font-bold text-forest">
            {zoneOver
              ? "Drop to upload"
              : isMobile
                ? "Tap to add photos"
                : "Drag & drop photos here"}
          </div>
          <div className="max-w-[340px] text-sm text-pretty text-ink-soft">
            JPG or PNG · up to 4 photos. The first photo becomes the main image.
          </div>
          <span className="mt-1 box-content flex h-[42px] items-center gap-2 rounded-full border-[1.5px] border-solid border-primary bg-surface px-5 text-[14.5px] font-bold text-primary">
            <Icon name="plus" size={17} />
            Choose photos
          </span>
        </div>
      ) : (
        <div
          onDragOver={onZoneOver}
          onDragLeave={() => setZoneOver(false)}
          onDrop={onZoneDrop}
          className="grid grid-cols-4 gap-2 md:gap-3.5"
        >
          {photos.map((photo, i) => {
            const first = i === 0;
            const last = i === photos.length - 1;
            return (
              <div
                key={photo.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i));
                  setDragIndex(i);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndex !== null) onMove(dragIndex, i);
                  else onAdd(Array.from(e.dataTransfer.files));
                  setDragIndex(null);
                  setZoneOver(false);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  "relative flex min-w-0 cursor-grab flex-col overflow-hidden rounded-[14px] border-[1.5px] bg-white shadow-[0_1px_2px_rgba(47,70,54,.05),0_6px_16px_-10px_rgba(47,70,54,.25)] transition-[border-color,opacity] duration-150",
                  dragIndex !== null && dragIndex !== i
                    ? "border-dashed border-lilac"
                    : first
                      ? "border-solid border-primary"
                      : "border-solid border-[rgba(47,70,54,.08)]",
                  dragIndex === i ? "opacity-45" : "opacity-100",
                )}
              >
                <div
                  className="relative aspect-square bg-image bg-cover bg-center"
                  style={{ backgroundImage: `url(${photo.src})` }}
                >
                  {first ? (
                    <span className="absolute top-2 left-2 flex h-6 items-center rounded-full bg-primary px-2.5 text-xs font-bold text-white">
                      Main
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemove(photo.id)}
                    aria-label="Remove photo"
                    className="absolute top-1.5 right-1.5 flex size-[30px] items-center justify-center rounded-full border-none bg-[rgba(250,251,248,.95)] text-forest shadow-[0_2px_6px_rgba(47,70,54,.2)] hover:bg-white hover:text-danger"
                  >
                    <Icon name="x" size={15} strokeWidth={2.6} />
                  </button>
                </div>
                <div className="box-content grid h-8 grid-cols-[1fr_auto_1fr] items-center border-t border-solid border-[rgba(47,70,54,.07)] bg-field-alt">
                  <button
                    type="button"
                    onClick={() => onMove(i, i - 1)}
                    disabled={first}
                    aria-label="Move left"
                    className={cn(
                      "flex h-8 items-center justify-center border-none bg-transparent",
                      first ? "text-ink-past" : "text-forest",
                    )}
                  >
                    <Icon name="chevronLeft" size={15} strokeWidth={2.4} />
                  </button>
                  <Icon name="grip" size={16} className="text-ink-faint" />
                  <button
                    type="button"
                    onClick={() => onMove(i, i + 1)}
                    disabled={last}
                    aria-label="Move right"
                    className={cn(
                      "flex h-8 items-center justify-center border-none bg-transparent",
                      last ? "text-ink-past" : "text-forest",
                    )}
                  >
                    <Icon name="chevronRight" size={15} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            );
          })}
          {left > 0 ? (
            <button
              type="button"
              onClick={openPicker}
              className={cn(
                "flex aspect-[1/1.4] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed p-2 text-primary transition-[background] duration-150 hover:bg-lavender-soft md:aspect-auto",
                zoneBorder,
                zoneBg,
              )}
              aria-label="Add photo"
            >
              <Icon name="cloudUpload" size={26} strokeWidth={1.8} />
              <span className="hidden text-sm font-semibold text-forest md:inline">
                Add photo
              </span>
              <span className="hidden text-[12.5px] text-ink-soft md:inline">
                {left} more
              </span>
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}
