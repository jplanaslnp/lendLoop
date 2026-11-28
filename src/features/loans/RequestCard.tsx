import { Icon } from "@/components/ui/Icon";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { LoanStatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatRangeWithYear, formatShort } from "@/lib/dates";

import { getNeedsHint, requestContext } from "./loanPresentation";
import type { LoanView } from "./requestView";

type RequestCardProps = {
  request: LoanView;
  today: Date;
  selected: boolean;
  onSelect: () => void;
};

function Thumb({
  photo,
  className,
}: {
  photo: string | null;
  className: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-field bg-image", className)}>
      <div
        className="size-full bg-cover bg-center"
        style={photo ? { backgroundImage: `url(${photo})` } : undefined}
      />
    </div>
  );
}

/** The person's photo, or the shared initial avatar when there is none. */
function Face({
  request,
  className,
  size,
}: {
  request: LoanView;
  className: string;
  size: number;
}) {
  const { avatar, shortName } = request.person;
  return avatar ? (
    <span className={className} style={{ backgroundImage: `url(${avatar})` }} />
  ) : (
    <PersonAvatar name={shortName} imageUrl={null} size={size} />
  );
}

function Person({
  request,
  name,
  building,
  wide,
}: {
  request: LoanView;
  name: string;
  building: string;
  wide: boolean;
}) {
  return wide ? (
    <div className="flex items-center gap-2.5 text-[15px] text-forest">
      <Face
        request={request}
        size={28}
        className="size-7 flex-none rounded-full bg-cover bg-center"
      />
      <span className="font-medium">{name}</span>
      <span className="flex items-center gap-1.5 text-ink-muted">
        <span className="size-1 rounded-full bg-ink-muted" aria-hidden />
        {building}
      </span>
    </div>
  ) : (
    <div className="flex min-w-0 items-center gap-[7px] text-[13px] text-forest">
      <Face
        request={request}
        size={22}
        className="size-[22px] flex-none rounded-full bg-cover bg-center"
      />
      <span className="font-semibold whitespace-nowrap">{name}</span>
      <span className="whitespace-nowrap text-ink-muted">· {building}</span>
    </div>
  );
}

/**
 * Request list card. Renders the design's wide card (≥760px) and compact
 * card (<760px); only one is displayed at a time.
 */
export function RequestCard({
  request,
  today,
  selected,
  onSelect,
}: RequestCardProps) {
  const { person, start, end, itemName } = requestContext(request, today);
  const needs = getNeedsHint(request);

  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "box-border hidden w-full grid-cols-[150px_minmax(0,1fr)_24px] items-center gap-[22px] rounded-card border-[1.5px] border-solid bg-surface py-3 pr-5 pl-3 text-left shadow-[0_1px_2px_rgba(47,70,54,.04),0_10px_28px_-14px_rgba(47,70,54,.16)] transition-[transform,box-shadow] duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(47,70,54,.05),0_18px_34px_-16px_rgba(47,70,54,.24)] md:grid",
          selected
            ? "border-[rgba(47,70,54,.07)] lg:border-lilac lg:bg-lavender-select"
            : "border-[rgba(47,70,54,.07)]",
        )}
      >
        <Thumb photo={request.item.photo} className="aspect-[4/3]" />
        <div className="flex min-w-0 flex-col gap-[9px]">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-xl font-bold tracking-tight text-forest">
              {itemName}
            </span>
            <LoanStatusBadge
              status={request.status}
              className="h-8 flex-none gap-1.5 px-[13px] text-sm font-semibold"
            />
          </div>
          <Person
            request={request}
            name={person.shortName}
            building={person.place}
            wide
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-[15px] text-ink-link">
              <Icon name="calendar" size={20} strokeWidth={1.6} />
              {formatRangeWithYear(start, end)}
            </span>
            {needs ? (
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
                <span
                  className="size-[7px] rounded-full bg-primary"
                  aria-hidden
                />
                {needs}
              </span>
            ) : null}
          </div>
        </div>
        <Icon name="chevronRight" size={22} className="text-forest" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="box-border grid w-full grid-cols-[96px_minmax(0,1fr)_18px] items-center gap-3.5 rounded-card border border-solid border-[rgba(47,70,54,.07)] bg-surface py-2.5 pr-3 pl-2.5 text-left shadow-[0_1px_2px_rgba(47,70,54,.04),0_8px_22px_-12px_rgba(47,70,54,.16)] md:hidden"
      >
        <Thumb photo={request.item.photo} className="size-24" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex">
            <LoanStatusBadge
              status={request.status}
              iconSize={14}
              className="h-[26px] gap-[5px] px-2.5 text-[12.5px] font-bold"
            />
          </div>
          <span className="truncate text-[16.5px] font-bold text-forest">
            {itemName}
          </span>
          <Person
            request={request}
            name={person.shortName}
            building={person.place}
            wide={false}
          />
          <span className="flex items-center gap-1.5 text-[13px] text-ink-link">
            <Icon name="calendar" size={16} strokeWidth={1.7} />
            {formatShort(start)} – {formatShort(end)}
          </span>
          {needs ? (
            <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-primary">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {needs}
            </span>
          ) : null}
        </div>
        <Icon name="chevronRight" size={18} className="text-forest" />
      </button>
    </>
  );
}
