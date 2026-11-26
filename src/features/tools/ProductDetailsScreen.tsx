"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import {
  DesktopHeader,
  MobileBackHeader,
} from "@/components/layout/SiteHeader";
import { Logo } from "@/components/layout/Logo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ToolCard } from "@/components/listings/ToolCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DateRangeCalendar } from "@/components/ui/DateRangeCalendar";
import { Dialog } from "@/components/ui/Dialog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MapPreview } from "@/components/ui/MapPreview";
import { AvailabilityPill } from "@/components/ui/StatusBadge";
import { Toast, useToast } from "@/components/ui/Toast";
import { getCategory, getConditionLabel } from "@/config/categories";
import { ROUTES } from "@/config/navigation";
import { useMockSession } from "@/features/auth/MockSessionProvider";
import { cn } from "@/lib/cn";
import { formatShort, pluralDays } from "@/lib/dates";
import {
  buildBookedSet,
  pickDate,
  rangeLength,
  selectableLimit,
  type DateRange,
} from "@/lib/dateRange";
import { useGoBack } from "@/lib/useGoBack";
import { avatarSrc, firstName, MOCK_TODAY, PEOPLE } from "@/mocks/people";
import {
  getSimilarTools,
  MAX_LOAN_DAYS,
  MOCK_BOOKED_RANGES,
  type MockTool,
} from "@/mocks/tools";

import { ProductGallery } from "./ProductGallery";

const PANEL =
  "rounded-panel border border-solid border-[rgba(47,70,54,.07)] bg-surface";

const STEPS = [
  "Send a borrowing request to the owner.",
  "Wait for the owner to approve it.",
  "Arrange pickup with the owner.",
  "Confirm receipt when you collect the item.",
];

/** Product details with date selection and a mock borrow request flow. */
export function ProductDetailsScreen({ tool }: { tool: MockTool }) {
  const { isSignedIn, requireAuth, openAuth, guardLink } = useMockSession();
  const goBack = useGoBack();
  const toast = useToast(3600);
  const booked = useMemo(() => buildBookedSet(MOCK_BOOKED_RANGES), []);
  const datesRef = useRef<HTMLDivElement>(null);

  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [view, setView] = useState({
    year: MOCK_TODAY.getFullYear(),
    month: MOCK_TODAY.getMonth(),
  });
  const [requestOpen, setRequestOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const owner = PEOPLE[tool.ownerId];
  const ownerFirst = firstName(owner);
  const category = getCategory(tool.category);
  const availability = tool.available ? "available" : "borrowed";
  const pickupPlace = isSignedIn
    ? `${owner.building} · Gent`
    : "Gent · approximate area";

  const { start, end } = range;
  const valid = Boolean(start && end);
  const days = start && end ? rangeLength(start, end) : 0;
  const rangeText =
    start && end
      ? days === 1
        ? formatShort(start)
        : `${formatShort(start)} – ${formatShort(end)}`
      : "";
  const summary = `${rangeText} · ${pluralDays(days)}`;

  const status = (() => {
    if (start && end) {
      return {
        icon: "check" as IconName,
        color: "#2C6B34",
        text: `Available · ${rangeText} (${pluralDays(days)})`,
      };
    }
    if (start) {
      const limit = selectableLimit(start, MAX_LOAN_DAYS, booked);
      const n = rangeLength(start, limit);
      return {
        icon: "clock" as IconName,
        color: "#7040A0",
        text:
          n < MAX_LOAN_DAYS
            ? `Now pick an end date — available until ${formatShort(limit)} (booked after that).`
            : `Now pick an end date — up to ${MAX_LOAN_DAYS} days, until ${formatShort(limit)}.`,
      };
    }
    return {
      icon: "info" as IconName,
      color: "#556A5B",
      text: `Crossed-out dates are already booked. Loans can last up to ${MAX_LOAN_DAYS} days.`,
    };
  })();

  const onPick = (day: Date) => {
    const next = pickDate(range, day, MAX_LOAN_DAYS, booked);
    setRange(next);
    // On mobile the calendar closes once a full range is chosen.
    if (
      next.start &&
      next.end &&
      window.matchMedia("(max-width: 759.98px)").matches
    ) {
      setCalendarOpen(false);
    }
  };

  const focusDates = () => {
    const el = datesRef.current;
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 90,
        behavior: "smooth",
      });
    }
    setCalendarOpen(true);
  };

  const openRequest = () => {
    if (!valid) return;
    requireAuth(() => setRequestOpen(true));
  };

  const sendRequest = () => {
    setRequestOpen(false);
    setSent(true);
    setCalendarOpen(false);
    toast.show(`Request sent · ${ownerFirst} has been notified.`);
  };

  const fieldBorder = calendarOpen
    ? "border-primary shadow-focus"
    : valid
      ? "border-[rgba(112,64,160,.45)]"
      : "border-[rgba(47,70,54,.16)]";

  const requestRange =
    start && end
      ? rangeText +
        (start.getFullYear() !== MOCK_TODAY.getFullYear() ||
        end.getFullYear() !== MOCK_TODAY.getFullYear()
          ? `, ${end.getFullYear()}`
          : "")
      : "";

  const ownerBlock = (variant: "aside" | "mobile") =>
    isSignedIn ? (
      <Link
        href={ROUTES.user(owner.id)}
        className={cn(
          "grid w-full items-center gap-3.5 text-left text-forest hover:text-forest",
          variant === "aside"
            ? "grid-cols-[60px_minmax(0,1fr)_20px]"
            : "grid-cols-[56px_minmax(0,1fr)_20px]",
        )}
      >
        <Avatar
          src={avatarSrc(owner.id)}
          alt={owner.shortName}
          size={variant === "aside" ? 60 : 56}
        />
        <span className="min-w-0">
          <span
            className={cn(
              "block font-bold",
              variant === "aside" ? "text-[17px]" : "text-[16.5px]",
            )}
          >
            {owner.fullName}
          </span>
          <span className="mt-0.5 block text-sm text-ink-soft">
            {owner.building} · Gent
          </span>
          <span className="mt-1 block text-[13.5px] font-bold text-primary">
            View profile
          </span>
        </span>
        <Icon name="chevronRight" size={20} />
      </Link>
    ) : (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[14.5px] leading-normal text-ink-soft">
          Sign in to see who is sharing this item.
        </p>
        <Button
          variant="outline"
          onClick={() => openAuth()}
          className="min-h-[46px] text-[15px] font-bold"
        >
          Sign in
        </Button>
      </div>
    );

  const pickupDetails = (prefix: string) => (
    <>
      <span className="flex items-center gap-2 text-[15px] font-bold text-forest">
        <Icon name="pin" size={17} />
        <span>
          {prefix}
          {pickupPlace}
        </span>
      </span>
      <span className="flex items-center gap-2 text-[13.5px] text-ink-soft">
        <Icon name="lock" size={16} />
        Exact address shared after approval
      </span>
    </>
  );

  const titleBlock = (mobile: boolean) => (
    <div
      className={cn(
        "flex flex-wrap items-center",
        mobile ? "mt-2.5 gap-3" : "mt-3 gap-3.5",
      )}
    >
      <span
        className={cn(
          "flex items-center text-ink-muted",
          mobile ? "gap-[7px] text-[14.5px]" : "gap-2 text-base",
        )}
      >
        <Icon name={category.icon} size={mobile ? 17 : 18} strokeWidth={1.7} />
        {category.label}
      </span>
      <AvailabilityPill
        availability={availability}
        className={
          mobile
            ? "h-7 gap-1.5 px-[11px] text-[13px]"
            : "h-[30px] gap-[7px] px-3 text-sm"
        }
        dotClassName={mobile ? "size-[7px]" : "size-2"}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-sage pb-[calc(130px+env(safe-area-inset-bottom))] md:pb-[72px]">
      <DesktopHeader active="explore" />
      <MobileBackHeader onBack={goBack} center={<Logo variant="small" />} />

      <main className="mx-auto box-border max-w-[1200px] px-3.5 pt-3.5 md:px-8 md:pt-7 xl:px-14">
        <div className="hidden md:block">
          <button
            type="button"
            onClick={goBack}
            className="flex h-[38px] items-center gap-2 rounded-full border border-solid border-[rgba(47,70,54,.08)] bg-surface pr-4 pl-3 text-sm font-semibold whitespace-nowrap text-forest hover:bg-white"
          >
            <Icon name="arrowLeft" size={16} strokeWidth={2.2} />
            Back to Explore
          </button>
          <h1 className="mt-[18px] mb-0 text-[44px] leading-[1.05] font-extrabold tracking-tightest text-forest">
            {tool.name}
          </h1>
          {titleBlock(false)}
        </div>

        <div className="grid grid-cols-1 items-start gap-7 md:mt-[26px] bp960:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
          <div className="flex min-w-0 flex-col gap-4 md:gap-[22px]">
            <ProductGallery photos={tool.photos} name={tool.name} />

            <div className="md:hidden">
              <h1 className="m-0 text-[28px] leading-[1.1] font-extrabold tracking-tighter text-forest">
                {tool.name}
              </h1>
              {titleBlock(true)}
            </div>

            <section
              className={cn(
                PANEL,
                "flex flex-col px-4 py-[18px] shadow-panel-soft md:px-7 md:py-[26px]",
              )}
            >
              <div>
                <h2 className="m-0 text-[19px] font-extrabold text-forest md:text-[21px]">
                  Description
                </h2>
                <p className="mt-2 mb-0 text-[15px] leading-[1.6] text-pretty text-ink-link md:text-base">
                  {tool.longDescription ?? tool.description}
                </p>
              </div>

              <div className="my-[18px] h-px bg-[rgba(47,70,54,.1)] md:my-[22px]" />

              <div className="grid grid-cols-1 gap-[18px] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] md:gap-7">
                <div>
                  <h3 className="m-0 text-base font-extrabold text-forest md:text-[17px]">
                    Condition
                  </h3>
                  <span className="mt-2.5 inline-flex h-8 items-center rounded-full bg-lavender px-3.5 text-sm font-bold text-primary-deep">
                    {getConditionLabel(tool.condition)}
                  </span>
                  {tool.conditionNote ? (
                    <p className="mt-2 mb-0 text-[13.5px] leading-[1.45] text-ink-soft">
                      {tool.conditionNote}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h3 className="m-0 text-base font-extrabold text-forest md:text-[17px]">
                    Item details
                  </h3>
                  <dl className="mt-3 mb-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-[18px] gap-y-2 text-[14.5px]">
                    {[
                      ...(tool.details ?? []),
                      {
                        label: "Max. loan",
                        value: `Up to ${MAX_LOAN_DAYS} days`,
                      },
                    ].map((row) => (
                      <div key={row.label} className="contents">
                        <dt className="text-ink-soft">{row.label}</dt>
                        <dd className="m-0 font-semibold text-forest">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              <div className="my-[18px] h-px bg-[rgba(47,70,54,.1)] md:my-[22px]" />

              <div ref={datesRef}>
                <h2 className="m-0 text-[19px] font-extrabold text-forest md:text-[21px]">
                  Choose your dates
                </h2>
                <p className="mt-1.5 mb-0 text-[14.5px] text-ink-soft">
                  Select the period you&apos;d like to borrow this item.
                </p>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((o) => !o)}
                  aria-expanded={calendarOpen}
                  className={cn(
                    "mt-3.5 grid min-h-[54px] w-full grid-cols-[20px_minmax(0,1fr)_12px_minmax(0,1fr)_18px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-solid bg-white px-4 text-left",
                    fieldBorder,
                  )}
                >
                  <Icon
                    name="calendar"
                    size={19}
                    strokeWidth={1.7}
                    className="text-forest"
                  />
                  <span
                    className={cn(
                      "truncate text-[15px]",
                      start
                        ? "font-bold text-forest"
                        : "font-medium text-ink-faint",
                    )}
                  >
                    {start ? formatShort(start) : "Select start date"}
                  </span>
                  <span className="text-ink-faint">–</span>
                  <span
                    className={cn(
                      "truncate text-[15px]",
                      end
                        ? "font-bold text-forest"
                        : "font-medium text-ink-faint",
                    )}
                  >
                    {end ? formatShort(end) : "Select end date"}
                  </span>
                  <Icon
                    name="chevronDown"
                    size={18}
                    className={cn(
                      "text-forest transition-transform duration-200",
                      calendarOpen && "rotate-180",
                    )}
                  />
                </button>

                {calendarOpen ? (
                  <DateRangeCalendar
                    today={MOCK_TODAY}
                    booked={booked}
                    maxDays={MAX_LOAN_DAYS}
                    range={range}
                    view={view}
                    onViewChange={setView}
                    onPick={onPick}
                    onClear={() => setRange({ start: null, end: null })}
                  />
                ) : null}

                <div
                  className="mt-3 flex items-start gap-2 text-sm leading-[1.45] font-semibold"
                  style={{ color: status.color }}
                  aria-live="polite"
                >
                  <Icon
                    name={status.icon}
                    size={16}
                    strokeWidth={2.2}
                    className="mt-0.5 flex-none"
                  />
                  {status.text}
                </div>
              </div>
            </section>

            <section
              className={cn(
                PANEL,
                "px-4 py-[18px] shadow-panel-soft md:hidden",
              )}
            >
              <h2 className="mt-0 mb-3 text-[19px] font-extrabold text-forest">
                Owner
              </h2>
              {ownerBlock("mobile")}
            </section>
            <section
              className={cn(
                PANEL,
                "overflow-hidden shadow-panel-soft md:hidden",
              )}
            >
              <div className="px-4 pt-[18px] pb-3">
                <h2 className="m-0 text-[19px] font-extrabold text-forest">
                  Pickup location
                </h2>
              </div>
              <MapPreview circleSize={110} />
              <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
                {pickupDetails("")}
              </div>
            </section>
          </div>

          <aside
            className={cn(
              PANEL,
              "top-[92px] hidden min-w-0 flex-col gap-4 p-[18px] shadow-panel md:flex bp960:sticky",
            )}
          >
            <div>
              {sent ? (
                <>
                  <div className="flex min-h-[58px] items-center justify-center gap-2.5 rounded-full bg-warning-bg text-base font-bold text-warning-fg">
                    <Icon name="clock" size={19} />
                    Request sent · Pending
                  </div>
                  <p className="mt-2.5 mb-0 text-center text-sm text-ink-soft">
                    {valid
                      ? `${rangeText} · waiting for ${ownerFirst}.`
                      : `Waiting for ${ownerFirst}.`}{" "}
                    <Link
                      href={ROUTES.borrowing}
                      onClick={guardLink(ROUTES.borrowing)}
                      className="font-bold"
                    >
                      View in Borrowing
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openRequest}
                    disabled={!valid}
                    className={cn(
                      "flex min-h-[58px] w-full items-center justify-center gap-3 rounded-full border-none text-[17px] font-bold text-white transition-[background] duration-150",
                      valid
                        ? "bg-primary shadow-cta-lg hover:bg-primary-hover"
                        : "bg-primary-disabled",
                    )}
                  >
                    <Icon name="send" size={20} />
                    Request to borrow
                  </button>
                  <p className="mt-2.5 mb-0 text-center text-sm text-ink-soft">
                    {valid ? summary : "Select your dates to send a request."}
                    {!valid ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={focusDates}
                          className="border-none bg-transparent p-0 text-sm font-bold text-primary"
                        >
                          Choose dates
                        </button>
                      </>
                    ) : null}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-solid border-[rgba(112,64,160,.1)] bg-lavender-soft px-5 py-[18px]">
              <div className="flex items-center gap-2.5 text-[17px] font-extrabold text-primary-deep">
                <Icon name="info" size={20} />
                How it works
              </div>
              <ol className="mt-3.5 mb-0 flex list-none flex-col gap-2.5 p-0">
                {STEPS.map((text, i) => (
                  <li
                    key={text}
                    className="grid grid-cols-[24px_1fr] gap-2.5 text-[14.5px] leading-[1.45] text-forest"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-white text-[12.5px] font-extrabold text-primary">
                      {i + 1}
                    </span>
                    {text}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-solid border-[rgba(47,70,54,.08)] bg-white p-4">
              <h2 className="mt-0 mb-3 text-[17px] font-extrabold text-forest">
                Owner
              </h2>
              {ownerBlock("aside")}
            </div>

            <div className="overflow-hidden rounded-2xl border border-solid border-[rgba(47,70,54,.08)] bg-white">
              <MapPreview circleSize={96} />
              <div className="flex flex-col gap-1.5 px-4 py-3.5">
                {pickupDetails("Pickup · ")}
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-7 md:mt-12">
          <h2 className="mt-0 mb-3.5 text-[22px] font-extrabold tracking-tighter text-forest md:mb-5 md:text-[28px]">
            Similar items nearby
          </h2>
          <div className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-4">
            {getSimilarTools(tool).map((t) => (
              <ToolCard key={t.id} tool={t} size="similar" />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-solid border-[rgba(47,70,54,.08)] bg-surface px-4 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-mobile-cta md:hidden">
        {sent ? (
          <Link
            href={ROUTES.borrowing}
            onClick={guardLink(ROUTES.borrowing)}
            className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-warning-bg text-base font-bold text-warning-fg hover:text-warning-fg"
          >
            Request sent · View in Borrowing
          </Link>
        ) : (
          <>
            <div
              className={cn(
                "mb-2 flex items-center justify-center gap-1.5 text-[13px] font-semibold",
                valid ? "text-forest" : "text-ink-soft",
              )}
            >
              {valid ? summary : "Select your dates first"}
            </div>
            <button
              type="button"
              onClick={() => (valid ? openRequest() : focusDates())}
              className={cn(
                "flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-full border-none text-[16.5px] font-bold text-white",
                valid ? "bg-primary shadow-cta-lg" : "bg-primary-disabled",
              )}
            >
              <Icon name="send" size={19} />
              {valid
                ? "Request to borrow"
                : start
                  ? "Select an end date"
                  : "Choose dates to request"}
            </button>
          </>
        )}
      </div>

      <Dialog
        open={requestOpen && valid}
        onClose={() => setRequestOpen(false)}
        label="Confirm your request"
        panelClassName="max-h-[calc(100vh-24px)] max-w-[460px] overflow-auto rounded-modal p-[26px] shadow-modal"
      >
        <h3 className="m-0 text-[22px] font-extrabold tracking-tight text-forest">
          Confirm your request
        </h3>
        <div className="mt-[18px] grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3.5 rounded-2xl border border-solid border-[rgba(47,70,54,.08)] bg-white p-3">
          <span
            className="aspect-[4/3] w-[84px] rounded-[10px] bg-image bg-cover bg-center"
            style={
              tool.photos[0]?.kind === "image"
                ? { backgroundImage: `url(${tool.photos[0].src})` }
                : undefined
            }
          />
          <div className="min-w-0">
            <div className="text-base font-bold text-forest">{tool.name}</div>
            <div className="mt-[3px] text-sm text-ink-soft">
              From {owner.shortName} · {owner.building}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-lavender-soft px-4 py-3.5">
          <Icon
            name="calendar"
            size={22}
            strokeWidth={1.7}
            className="flex-none text-primary"
          />
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold text-forest">
              {requestRange}
            </div>
          </div>
          <span className="flex-none rounded-full bg-white px-3 py-1.5 text-[13.5px] font-bold text-primary-deep">
            {pluralDays(days)}
          </span>
        </div>
        <label className="mt-4 flex flex-col gap-2 text-[14.5px] font-bold text-forest">
          <span>
            Message to {ownerFirst}{" "}
            <span className="block text-[13.5px] font-medium text-ink-soft">
              Optional
            </span>
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder={`e.g. Hi ${ownerFirst}, I'd like to use it for a weekend trip.`}
            className="box-border w-full resize-none rounded-field border border-solid border-[rgba(47,70,54,.18)] bg-white px-3.5 py-3 font-sans text-[15px] leading-[1.45] font-normal text-forest outline-none focus:border-primary focus:shadow-focus"
          />
        </label>
        <p className="mt-3.5 mb-0 text-[13.5px] leading-normal text-pretty text-ink-soft">
          {ownerFirst} will review your request. Once approved you&apos;ll get
          the exact pickup address, and the loan starts when you confirm
          you&apos;ve collected the item.
        </p>
        <div className="mt-[22px] flex flex-wrap gap-2.5">
          <Button
            variant="neutral"
            onClick={() => setRequestOpen(false)}
            className="min-h-[50px] flex-[1_1_130px] text-[15px] font-bold"
          >
            Back
          </Button>
          <Button
            onClick={sendRequest}
            className="min-h-[50px] flex-[1_1_180px] text-[15px] font-bold"
          >
            Send request
          </Button>
        </div>
      </Dialog>

      <Toast
        message={toast.message}
        className="bottom-[calc(140px+env(safe-area-inset-bottom))] md:bottom-8"
      />
    </div>
  );
}
