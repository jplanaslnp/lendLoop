"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  DesktopHeader,
  MobileBrandHeader,
} from "@/components/layout/SiteHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import {
  CATEGORIES,
  CONDITIONS,
  getCategory,
  type CategoryId,
  type ConditionId,
} from "@/config/categories";
import { ROUTES } from "@/config/navigation";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { cn } from "@/lib/cn";
import { MOBILE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";

import { GoodToKnow, ListingPreviewCard } from "./ListingPreview";
import { MAX_PHOTOS, PhotoPicker, type LocalPhoto } from "./PhotoPicker";
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  SHARE_FIELD_ORDER,
  validateShareForm,
  type ShareField,
} from "./shareForm";

const LABEL = "text-base font-bold text-forest md:text-[17px]";
const INPUT =
  "box-border h-[50px] w-full rounded-field border border-solid bg-white text-base text-forest outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary focus:shadow-focus md:h-[52px]";
const ERROR_TEXT = "text-[13.5px] font-semibold text-danger";

let photoSeq = 0;

/** Share a Tool — create-listing form with live preview (UI only). */
export function ShareToolScreen() {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [condition, setCondition] = useState<ConditionId | "">("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [tried, setTried] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [published, setPublished] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Release in-memory object URLs when leaving the page.
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.src));
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  const allErrors = validateShareForm({
    name,
    category,
    condition,
    description,
    photoCount: photos.length,
  });
  const errors = tried ? allErrors : {};

  const note = (message: string) => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setUploadNote(message);
    noteTimer.current = setTimeout(() => setUploadNote(null), 3500);
  };

  const addFiles = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (images.length > room) {
      note(
        room > 0
          ? `Only ${room} more photo${room === 1 ? "" : "s"} fit — extra files were skipped.`
          : "You already have 4 photos. Remove one to add another.",
      );
    }
    const added = images.slice(0, Math.max(0, room)).map((file) => ({
      id: `p${++photoSeq}`,
      src: URL.createObjectURL(file),
    }));
    setPhotos((list) => [...list, ...added].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (id: string) =>
    setPhotos((list) => {
      const removed = list.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.src);
      return list.filter((p) => p.id !== id);
    });

  const movePhoto = (from: number, to: number) =>
    setPhotos((list) => {
      if (to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const first = SHARE_FIELD_ORDER.find((k) => allErrors[k]);
    if (first) {
      setTried(true);
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 100,
          behavior: "smooth",
        });
        const input = el.querySelector<HTMLElement>(
          "input,select,textarea,button",
        );
        if (input && first !== "photos") {
          setTimeout(() => input.focus({ preventScroll: true }), 350);
        }
      }
      return;
    }
    setPublished(name.trim());
  };

  const shareAnother = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.src));
    setName("");
    setCategory("");
    setCondition("");
    setDescription("");
    setPhotos([]);
    setTried(false);
    setPublished(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const border = (key: ShareField) =>
    errors[key] ? "border-danger-border" : "border-[rgba(47,70,54,.18)]";
  const mainPhoto = photos[0]?.src ?? null;
  const counterHot = description.length >= 280;

  return (
    <div className="min-h-screen bg-sage pb-0 md:pb-[72px]">
      <DesktopHeader />
      <MobileBrandHeader />

      <RequireAuth>
        <main className="mx-auto box-border max-w-[1440px] px-4 pt-[22px] md:px-8 md:pt-9 xl:px-14">
          <h1 className="m-0 text-[34px] leading-[1.05] font-extrabold tracking-tightest text-forest md:text-[44px]">
            Share a tool
          </h1>
          <p className="mt-2.5 mb-0 text-[15px] leading-[1.45] text-pretty text-ink-muted md:text-[17px]">
            Give your belongings a second life by sharing them with your
            neighbors.
          </p>

          <div className="mt-5 grid grid-cols-1 items-start gap-7 md:mt-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]">
            <form
              onSubmit={submit}
              noValidate
              className="-mx-4 flex min-w-0 flex-col gap-[22px] rounded-t-modal border border-solid border-[rgba(47,70,54,.07)] bg-surface px-4 pt-[22px] pb-[calc(22px+env(safe-area-inset-bottom))] shadow-panel md:mx-0 md:gap-7 md:rounded-panel md:p-8"
            >
              <div data-field="name" className="flex flex-col gap-2.5">
                <label htmlFor="f-name" className={LABEL}>
                  Item name <Required />
                </label>
                <input
                  id="f-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={NAME_MAX}
                  placeholder="e.g. Cordless drill"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "f-name-error" : undefined}
                  className={cn(INPUT, "px-4", border("name"))}
                />
                <FieldError id="f-name-error" message={errors.name} />
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-y-7 lg:grid-cols-1 bp1180:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div
                  data-field="category"
                  className="flex min-w-0 flex-col gap-2.5"
                >
                  <label htmlFor="f-cat" className={LABEL}>
                    Category <Required />
                  </label>
                  <div className="relative">
                    <Icon
                      name={category ? getCategory(category).icon : "grid"}
                      size={20}
                      strokeWidth={1.7}
                      className={cn(
                        "pointer-events-none absolute top-1/2 left-4 -mt-2.5",
                        category ? "text-forest" : "text-ink-faint",
                      )}
                    />
                    <select
                      id="f-cat"
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as CategoryId | "")
                      }
                      aria-invalid={Boolean(errors.category)}
                      aria-describedby={
                        errors.category ? "f-cat-error" : undefined
                      }
                      className={cn(
                        INPUT,
                        "cursor-pointer appearance-none pr-11 pl-12 font-medium",
                        category ? "text-forest" : "text-ink-faint",
                        border("category"),
                      )}
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <Icon
                      name="chevronDown"
                      size={18}
                      className="pointer-events-none absolute top-1/2 right-4 -mt-[9px] text-forest"
                    />
                  </div>
                  <FieldError id="f-cat-error" message={errors.category} />
                </div>

                <div
                  data-field="condition"
                  className="flex min-w-0 flex-col gap-2.5"
                >
                  <span id="f-cond-label" className={LABEL}>
                    Condition <Required />
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="f-cond-label"
                    className="grid min-h-[50px] grid-cols-4 items-center gap-2 md:min-h-[52px]"
                  >
                    {CONDITIONS.map((c) => {
                      const on = condition === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setCondition(c.id)}
                          className={cn(
                            "h-11 rounded-full border-[1.5px] border-solid px-1.5 text-[14.5px] whitespace-nowrap transition-all duration-150 hover:border-lilac",
                            on
                              ? "border-primary bg-lavender font-bold text-primary-deep"
                              : cn(
                                  "bg-white font-medium text-forest",
                                  errors.condition
                                    ? "border-danger-border"
                                    : "border-[rgba(47,70,54,.16)]",
                                ),
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={errors.condition} />
                </div>
              </div>

              <div data-field="description" className="flex flex-col gap-2.5">
                <label htmlFor="f-desc" className={LABEL}>
                  Description <Required />
                </label>
                <div className="relative">
                  <textarea
                    id="f-desc"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value.slice(0, DESCRIPTION_MAX))
                    }
                    maxLength={DESCRIPTION_MAX}
                    rows={4}
                    placeholder={
                      isMobile
                        ? "Describe the item, its features…"
                        : "Describe the item, its features and anything useful for borrowers (e.g. includes charger, accessories, etc.)"
                    }
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description ? "f-desc-error" : undefined
                    }
                    className={cn(
                      "box-border block min-h-[120px] w-full resize-y rounded-field border border-solid bg-white px-4 pt-3.5 pb-[34px] font-sans text-base leading-normal text-forest outline-none focus:border-primary focus:shadow-focus md:min-h-[140px]",
                      border("description"),
                    )}
                  />
                  <span
                    className={cn(
                      "pointer-events-none absolute right-3.5 bottom-2.5 text-[13px]",
                      counterHot
                        ? "font-bold text-primary"
                        : "font-medium text-ink-faint",
                    )}
                  >
                    {description.length} / {DESCRIPTION_MAX}
                  </span>
                </div>
                <FieldError id="f-desc-error" message={errors.description} />
              </div>

              <div data-field="photos" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className={LABEL}>
                    Photos <Required />{" "}
                    <span className="text-[15px] font-medium text-ink-soft">
                      (up to 4)
                    </span>
                  </span>
                  {photos.length > 0 ? (
                    <span className="text-[13.5px] text-ink-soft">
                      {isMobile
                        ? "Use arrows to reorder"
                        : "Drag or use arrows to reorder · first is main"}
                    </span>
                  ) : null}
                </div>
                <PhotoPicker
                  photos={photos}
                  onAdd={addFiles}
                  onRemove={removePhoto}
                  onMove={movePhoto}
                  hasError={Boolean(errors.photos)}
                  isMobile={isMobile}
                />
                <FieldError message={errors.photos} />
                {uploadNote ? (
                  <span
                    role="status"
                    className="text-[13.5px] font-semibold text-primary"
                  >
                    {uploadNote}
                  </span>
                ) : null}
              </div>

              <div className="-mx-0.5 border-y border-solid border-[rgba(47,70,54,.1)] md:hidden">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((o) => !o)}
                  aria-expanded={previewOpen}
                  className="flex min-h-14 w-full items-center justify-between border-none bg-transparent px-1 text-lg font-extrabold text-forest"
                >
                  Listing preview
                  <Icon
                    name="chevronDown"
                    size={20}
                    className={cn(
                      "transition-transform duration-200",
                      previewOpen && "rotate-180",
                    )}
                  />
                </button>
                {previewOpen ? (
                  <div className="flex flex-col gap-4 pb-[18px]">
                    <p className="m-0 text-sm text-ink-soft">
                      This is how your item will appear in Explore.
                    </p>
                    <div className="mx-auto w-full max-w-[360px]">
                      <ListingPreviewCard
                        name={name}
                        description={description}
                        mainPhoto={mainPhoto}
                        variant="inline"
                      />
                    </div>
                    <GoodToKnow variant="inline" />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col-reverse justify-between gap-3 md:flex-row md:border-t md:border-solid md:border-[rgba(47,70,54,.1)] md:pt-6">
                <ButtonLink
                  href={ROUTES.explore}
                  variant="neutral"
                  className="min-h-[50px] px-7 text-base font-semibold"
                >
                  Cancel
                </ButtonLink>
                <Button
                  type="submit"
                  className="min-h-[52px] gap-2.5 px-8 text-base font-bold"
                >
                  <Icon name="publish" size={19} strokeWidth={2.2} />
                  Publish item
                </Button>
              </div>
            </form>

            <aside className="top-[92px] hidden min-w-0 flex-col gap-[18px] rounded-panel border border-solid border-[rgba(47,70,54,.07)] bg-surface p-6 shadow-panel md:flex lg:sticky">
              <div>
                <h2 className="m-0 text-2xl font-extrabold tracking-tighter text-forest">
                  Listing preview
                </h2>
                <p className="mt-1.5 mb-0 text-[15px] text-ink-soft">
                  This is how your item will appear in Explore.
                </p>
              </div>
              <ListingPreviewCard
                name={name}
                description={description}
                mainPhoto={mainPhoto}
                variant="side"
              />
              <GoodToKnow variant="side" />
            </aside>
          </div>
        </main>
      </RequireAuth>

      <Dialog
        open={published !== null}
        onClose={shareAnother}
        closeOnBackdrop={false}
        label={`${published ?? ""} is live`}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-success-bg">
          <Icon
            name="check"
            size={28}
            strokeWidth={2.4}
            className="text-success-ink"
          />
        </div>
        <h3 className="mt-[18px] mb-0 text-[22px] font-extrabold tracking-tight text-forest">
          {published} is live
        </h3>
        <p className="mt-2.5 mb-0 text-[15px] leading-normal text-pretty text-ink-muted">
          It&apos;s now visible to your neighbors in Explore. You&apos;ll find
          incoming requests in Lending.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button
            variant="neutral"
            onClick={shareAnother}
            className="min-h-[50px] flex-[1_1_140px] text-[15px] font-bold"
          >
            Share another
          </Button>
          <ButtonLink
            href={ROUTES.explore}
            variant="primaryFlat"
            className="min-h-[50px] flex-[1_1_160px] text-[15px] font-bold"
          >
            View in Explore
          </ButtonLink>
        </div>
      </Dialog>
    </div>
  );
}

function Required() {
  return (
    <span className="text-danger" aria-hidden>
      *
    </span>
  );
}

function FieldError({
  id,
  message,
}: {
  id?: string;
  message?: string;
}): ReactNode {
  return message ? (
    <span id={id} className={ERROR_TEXT}>
      {message}
    </span>
  ) : null;
}
