"use client";

import {
  dayKey,
  formatShort,
  isSameDay,
  MONTH_LONG,
  WEEKDAYS_SHORT,
} from "@/lib/dates";
import { selectableLimit, type DateRange } from "@/lib/dateRange";
import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

type View = { year: number; month: number };

type DateRangeCalendarProps = {
  today: Date;
  booked: Set<number>;
  maxDays: number;
  range: DateRange;
  view: View;
  onViewChange: (view: View) => void;
  onPick: (day: Date) => void;
  onClear: () => void;
};

/**
 * Date-range calendar from the Product Details design. Shows one month on
 * mobile and 960–1179px, two months on 760–959px and ≥1180px (pure CSS).
 */
export function DateRangeCalendar({
  today,
  booked,
  maxDays,
  range,
  view,
  onViewChange,
  onPick,
  onClear,
}: DateRangeCalendarProps) {
  const second = new Date(view.year, view.month + 1, 1);
  const atMin =
    view.year === today.getFullYear() && view.month === today.getMonth();
  const shift = (n: number) => {
    const t = new Date(view.year, view.month + n, 1);
    onViewChange({ year: t.getFullYear(), month: t.getMonth() });
  };

  return (
    <div className="mt-3 rounded-2xl border border-solid border-[rgba(47,70,54,.1)] bg-white px-2 py-3 shadow-calendar md:p-[18px]">
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 bp960:grid-cols-1 bp1180:grid-cols-2">
        <Month
          year={view.year}
          month={view.month}
          today={today}
          booked={booked}
          maxDays={maxDays}
          range={range}
          onPick={onPick}
          showPrev
          prevDisabled={atMin}
          onPrev={() => shift(-1)}
          /* Next arrow on the first month only in one-month layouts. */
          nextClassName="flex md:hidden bp960:flex bp1180:hidden"
          onNext={() => shift(1)}
        />
        <Month
          className="hidden md:block bp960:hidden bp1180:block"
          year={second.getFullYear()}
          month={second.getMonth()}
          today={today}
          booked={booked}
          maxDays={maxDays}
          range={range}
          onPick={onPick}
          nextClassName="flex"
          onNext={() => shift(1)}
        />
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-solid border-[rgba(47,70,54,.08)] pt-3">
        <div className="flex flex-wrap items-center gap-3.5 text-[12.5px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-primary" aria-hidden />
            Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="box-content size-3 rounded-full border border-solid border-booked-legend-border bg-booked-legend"
              aria-hidden
            />
            Unavailable
          </span>
        </div>
        {range.start ? (
          <button
            type="button"
            onClick={onClear}
            className="h-9 rounded-full border-none bg-transparent px-3 text-sm font-bold text-primary hover:bg-lavender-soft"
          >
            Clear dates
          </button>
        ) : null}
      </div>
    </div>
  );
}

type MonthProps = {
  year: number;
  month: number;
  today: Date;
  booked: Set<number>;
  maxDays: number;
  range: DateRange;
  onPick: (day: Date) => void;
  showPrev?: boolean;
  prevDisabled?: boolean;
  onPrev?: () => void;
  nextClassName: string;
  onNext: () => void;
  className?: string;
};

function Month({
  year,
  month,
  today,
  booked,
  maxDays,
  range,
  onPick,
  showPrev,
  prevDisabled,
  onPrev,
  nextClassName,
  onNext,
  className,
}: MonthProps) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const { start, end } = range;
  const limit = start && !end ? selectableLimit(start, maxDays, booked) : null;
  const hasBand = Boolean(start && end && !isSameDay(start, end));

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2.5 grid grid-cols-[40px_1fr_40px] items-center">
        {showPrev ? (
          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled}
            aria-label="Previous month"
            className="flex size-10 items-center justify-center rounded-full border-none bg-transparent text-forest enabled:hover:bg-hover-sage disabled:opacity-30"
          >
            <Icon name="chevronLeft" size={18} strokeWidth={2.2} />
          </button>
        ) : null}
        <span className="col-start-2 text-center text-[15.5px] font-extrabold text-forest">
          {MONTH_LONG[month]} {year}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className={cn(
            "col-start-3 size-10 items-center justify-center rounded-full border-none bg-transparent text-forest hover:bg-hover-sage",
            nextClassName,
          )}
        >
          <Icon name="chevronRight" size={18} strokeWidth={2.2} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS_SHORT.map((wd) => (
          <span
            key={wd}
            className="pb-1.5 text-center text-xs font-bold text-ink-faint"
          >
            {wd}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(year, month, i + 1);
          const past = d < today;
          const isBooked = booked.has(dayKey(d));
          const isStart = start ? isSameDay(d, start) : false;
          const isEnd = end ? isSameDay(d, end) : false;
          const inRange = Boolean(start && end && d > start && d < end);
          const outOfReach = Boolean(limit && d > limit);
          const blocked = past || isBooked;
          const selected = isStart || isEnd;
          const isToday = isSameDay(d, today);

          let band = "transparent";
          if (hasBand) {
            if (inRange) band = "#EFE5F8";
            if (isStart)
              band = "linear-gradient(90deg,transparent 50%,#EFE5F8 50%)";
            if (isEnd)
              band = "linear-gradient(90deg,#EFE5F8 50%,transparent 50%)";
          }
          const fg = selected
            ? "#FFFFFF"
            : isBooked
              ? "#B9A9A9"
              : past
                ? "#C3CCC5"
                : outOfReach
                  ? "#A9B5AC"
                  : "#2F4636";

          return (
            <div
              key={i}
              className="flex justify-center"
              style={{ background: band }}
            >
              <button
                type="button"
                onClick={() => onPick(d)}
                disabled={blocked}
                aria-label={`${formatShort(d)}${isBooked ? ", unavailable" : past ? ", past" : ""}`}
                aria-pressed={selected}
                className="flex size-10 items-center justify-center rounded-full p-0 text-sm md:size-[38px]"
                style={{
                  border: isToday && !selected ? "1.5px solid #B796D8" : "none",
                  background: selected
                    ? "#7040A0"
                    : isBooked
                      ? "#F1ECEC"
                      : "transparent",
                  color: fg,
                  fontWeight: selected || isToday ? 800 : 500,
                  textDecoration: isBooked ? "line-through" : "none",
                }}
              >
                {i + 1}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
