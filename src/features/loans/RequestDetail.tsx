import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { MapPreview } from "@/components/ui/MapPreview";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { LoanStatusBadge } from "@/components/ui/StatusBadge";
import { Timeline } from "@/components/ui/Timeline";
import { LOAN_STATUS_STYLES } from "@/config/loanStatus";
import { ROUTES } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { formatRangeWithYear, pluralDays } from "@/lib/dates";
import { rangeLength } from "@/lib/dateRange";

import {
  getActions,
  getBanner,
  getTimeline,
  requestContext,
  type ActionType,
} from "./loanPresentation";
import type { LoanView } from "./requestView";

type RequestDetailProps = {
  request: LoanView;
  today: Date;
  onAction: (type: ActionType) => void;
  /** Whether an action is offered (Convex enforces the same rules). */
  canAct?: (type: ActionType) => boolean;
};

/** Request/loan detail panel (sticky on ≥1000px, full screen on mobile). */
export function RequestDetail({
  request,
  today,
  onAction,
  canAct,
}: RequestDetailProps) {
  const { person, start, end, itemName, isOwner } = requestContext(
    request,
    today,
  );
  const banner = getBanner(request, today);
  const bannerStyle = LOAN_STATUS_STYLES[banner.status];
  const actions = getActions(request, today).filter(
    (a) => !canAct || a.kind === "info" || canAct(a.type),
  );
  const place = person.pickupArea;
  const earlyStatus = ["pending", "declined", "cancelled"].includes(
    request.status,
  );

  return (
    <section
      aria-label={`${itemName} request`}
      className="top-[92px] min-w-0 rounded-panel border border-solid border-[rgba(47,70,54,.07)] bg-surface p-2.5 shadow-panel-strong md:p-[18px] lg:sticky"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-image md:aspect-[16/9]">
        <span
          className="block size-full bg-cover bg-center"
          style={
            request.item.photo
              ? { backgroundImage: `url(${request.item.photo})` }
              : undefined
          }
          role="img"
          aria-label={itemName}
        />
        <button
          type="button"
          aria-label="More"
          className="absolute top-3.5 right-3.5 hidden size-[42px] items-center justify-center rounded-full border-none bg-[rgba(250,251,248,.94)] text-forest shadow-[0_2px_8px_rgba(47,70,54,.15)] lg:flex"
        >
          <Icon name="dots" size={20} />
        </button>
      </div>

      <div className="px-2 md:px-1.5">
        <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[28px] leading-[1.1] font-extrabold tracking-tighter text-forest md:text-[32px]">
            {itemName}
          </h2>
          <LoanStatusBadge
            status={request.status}
            iconSize={17}
            className="h-[34px] gap-1.5 px-3.5 text-[14.5px] font-bold"
          />
        </div>

        <div className="border-b border-solid border-[rgba(47,70,54,.1)] py-4">
          <Link
            href={ROUTES.user(person.profileId)}
            className="flex items-center gap-3.5 text-forest hover:text-forest"
          >
            {person.avatar ? (
              <span
                className="block size-[52px] flex-none rounded-full bg-cover bg-center shadow-[0_2px_8px_-3px_rgba(47,70,54,.3)]"
                style={{ backgroundImage: `url(${person.avatar})` }}
              />
            ) : (
              <PersonAvatar name={person.name} imageUrl={null} size={52} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-forest">
                  {person.name}
                </span>
                <span className="rounded-full bg-lavender px-2 py-[3px] text-[11.5px] font-bold tracking-[.06em] text-primary uppercase">
                  {isOwner ? "Borrower" : "Owner"}
                </span>
              </div>
              <div className="mt-[3px] text-sm text-ink-soft">{place}</div>
              <div className="mt-1 text-[13.5px] font-bold text-primary">
                View Profile
              </div>
            </div>
            <Icon name="chevronRight" size={20} />
          </Link>
          {!isOwner ? (
            <div className="mt-3.5 overflow-hidden rounded-[14px] border border-solid border-[rgba(47,70,54,.08)] bg-white">
              <MapPreview circleSize={92} className="max-h-[150px] w-full" />
              <div className="flex flex-col gap-1 px-3.5 py-3">
                <span className="flex items-center gap-2 text-[14.5px] font-bold text-forest">
                  <Icon name="pin" size={16} />
                  <span>Pickup area · {place}</span>
                </span>
                <span className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <Icon name="lock" size={15} />
                  <span>
                    {earlyStatus
                      ? "Exact address shared after approval"
                      : "Exact address available via View Pickup Address"}
                  </span>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3.5 border-b border-solid border-[rgba(47,70,54,.1)] py-4">
          <Icon
            name="calendar"
            size={28}
            strokeWidth={1.5}
            className="flex-none text-forest"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-ink-soft">
              {request.status === "cancelled" || request.status === "declined"
                ? "Requested period"
                : "Loan period"}
            </div>
            <div className="mt-0.5 text-[17px] font-bold text-forest">
              {formatRangeWithYear(start, end)}
            </div>
          </div>
          <span className="flex-none rounded-full bg-lavender px-3.5 py-[7px] text-sm font-bold text-primary-deep">
            {pluralDays(rangeLength(start, end))}
          </span>
        </div>

        {request.message ? (
          <div className="border-b border-solid border-[rgba(47,70,54,.1)] py-4">
            <div className="text-sm text-ink-soft">
              {isOwner ? `Message from ${person.first}` : "Your message"}
            </div>
            <p className="mt-0.5 mb-0 text-[15px] leading-normal whitespace-pre-line text-forest">
              {request.message}
            </p>
          </div>
        ) : null}

        <div
          className="mt-4 flex items-start gap-3 rounded-[14px] border border-solid border-[rgba(0,0,0,.04)] px-4 py-3.5"
          style={{ background: bannerStyle.bg, color: bannerStyle.fg }}
        >
          <Icon name={banner.icon} size={20} className="mt-px flex-none" />
          <div className="min-w-0">
            <div className="text-[14.5px] font-bold">{banner.title}</div>
            <div className="mt-0.5 text-sm leading-[1.45] text-pretty">
              {banner.text}
            </div>
          </div>
        </div>

        <Timeline steps={getTimeline(request, today)} />
      </div>

      {actions.length > 0 ? (
        <div className="sticky bottom-0 -mx-2.5 mt-2 -mb-2.5 flex flex-wrap gap-3 rounded-b-panel border-t border-solid border-[rgba(47,70,54,.1)] bg-surface px-2 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] md:relative md:mx-0 md:mt-1 md:mb-0 md:rounded-none md:px-1.5 md:pt-[18px] md:pb-0.5">
          {actions.map((action) => {
            if (action.kind === "info") {
              const s = LOAN_STATUS_STYLES[action.status];
              return (
                <div
                  key={action.label}
                  className="box-border flex min-h-[54px] flex-[1_1_100%] items-center justify-center gap-2.5 rounded-full px-[22px] text-[15.5px] font-bold"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <Icon name={action.icon} size={20} />
                  {action.label}
                </div>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => onAction(action.type)}
                className={cn(
                  "flex items-center justify-center rounded-full font-bold",
                  action.kind === "primary" &&
                    "min-h-[54px] flex-[1_1_220px] gap-2.5 border-none bg-primary px-[22px] text-base text-white shadow-cta hover:bg-primary-hover",
                  action.kind === "secondary" &&
                    "min-h-[54px] flex-[1_1_220px] gap-2.5 border-[1.5px] border-solid border-primary bg-surface px-[22px] text-base text-primary hover:bg-lavender-soft",
                  action.kind === "ghost" &&
                    "min-h-[46px] flex-[1_1_100%] gap-2 border-none bg-transparent px-[18px] text-[15px] text-danger hover:bg-danger-hover-bg",
                )}
              >
                <Icon
                  name={action.icon}
                  size={action.kind === "ghost" ? 18 : 20}
                />
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
