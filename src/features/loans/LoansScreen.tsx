"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import {
  CircleIconButton,
  DesktopHeader,
  MobileBackHeader,
  MobileBrandHeader,
} from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChipRow, FilterChip } from "@/components/ui/FilterChip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Toast, useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/config/navigation";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { cn } from "@/lib/cn";
import { formatShort } from "@/lib/dates";
import type { RequestRole } from "@/mocks/requests";

import {
  FILTERS,
  requestContext,
  type ActionType,
  type FilterKey,
} from "./loanPresentation";
import { RequestCard } from "./RequestCard";
import { RequestDetail } from "./RequestDetail";
import type { LoanView } from "./requestView";

const COPY = {
  sent: {
    title: "Borrowing",
    lead: "Items you request and borrow from your neighbours.",
    activeLabel: "Borrowed",
    nav: "borrowing",
  },
  received: {
    title: "Lending",
    lead: "Items you own and share with your neighbours.",
    activeLabel: "On Loan",
    nav: "lending",
  },
} as const;

const CHIPS: { key: FilterKey; icon: IconName; stroke: number }[] = [
  { key: "all", icon: "grid", stroke: 1.7 },
  { key: "pending", icon: "clock", stroke: 1.7 },
  { key: "approved", icon: "check", stroke: 1.9 },
  { key: "active", icon: "swap", stroke: 1.7 },
  { key: "declined", icon: "x", stroke: 1.8 },
  { key: "returned", icon: "returnArrow", stroke: 1.7 },
  { key: "cancelled", icon: "ban", stroke: 1.7 },
];

const CHIP_LABEL: Record<Exclude<FilterKey, "active">, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
  cancelled: "Cancelled",
};

type ModalKind = "cancel" | "address" | "approve";
type ModalState = { kind: ModalKind; id: string } | null;

/**
 * Where a screen's requests come from and what its actions do: Convex for
 * Borrowing and Lending (Phase 8). See LoanPages.tsx.
 */
export type LoansData = {
  /** Undefined while loading. */
  requests: readonly LoanView[] | undefined;
  today: Date;
  /**
   * Whether an action is offered for this request (Convex enforces the same
   * rules). All design actions when unset.
   */
  canAct?: (request: LoanView, type: ActionType) => boolean;
  /**
   * Runs a status action; resolves to the toast to show, rejects with an
   * Error whose message explains why.
   */
  onAction: (
    request: LoanView,
    type: ActionType,
    input?: { pickupNote?: string },
  ) => Promise<string | null>;
  /** Cancels a request; resolves to the toast, rejects with a message. */
  cancel: (request: LoanView) => Promise<string>;
};

/** Borrowing (requests you sent) and Lending (requests you received). */
export function LoansScreen({
  role,
  data,
}: {
  role: RequestRole;
  data: LoansData;
}) {
  const copy = COPY[role];
  const router = useRouter();
  const toast = useToast(3800);
  const requests = data.requests ?? [];
  const today = data.today;
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);

  const statuses = FILTERS[filter];
  const rows = requests.filter((r) => !statuses || statuses.includes(r.status));
  const current = requests.find((r) => r.id === selectedId) ?? requests[0];

  /** Runs `work` once at a time and shows its toast or error message. */
  const run = async (work: () => Promise<string | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const message = await work();
      if (message) toast.show(message);
    } catch (error) {
      toast.show(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
      setModal(null);
    }
  };

  const onAction = (request: LoanView, type: ActionType) => {
    if (type === "details") {
      router.push(ROUTES.tool(request.item.routeId));
      return;
    }
    if (type === "address" || type === "cancel" || type === "approve") {
      setModal({ kind: type, id: request.id });
      return;
    }
    void run(() => data.onAction(request, type));
  };

  const modalRequest = modal
    ? requests.find((r) => r.id === modal.id)
    : undefined;

  return (
    <div
      className={cn("min-h-screen bg-sage md:pb-16", open ? "pb-0" : "pb-24")}
    >
      <DesktopHeader active={copy.nav} />
      <MobileBrandHeader className={open ? "hidden" : undefined} />
      <MobileBackHeader
        className={open ? undefined : "hidden"}
        onBack={() => setOpen(false)}
        center={
          <span className="text-center text-lg font-extrabold tracking-tight text-forest">
            {copy.title}
          </span>
        }
        right={
          <CircleIconButton label="More">
            <Icon name="dots" size={20} />
          </CircleIconButton>
        }
      />

      <RequireAuth>
        <main
          className={cn(
            "mx-auto max-w-[1440px] md:px-8 md:pt-9 xl:px-14",
            open ? "px-3 pt-3" : "px-4 pt-[22px]",
          )}
        >
          <div className={open ? "hidden lg:block" : undefined}>
            <h1 className="m-0 text-[34px] leading-[1.05] font-extrabold tracking-tightest text-forest md:text-[44px]">
              {copy.title}
            </h1>
            <p className="mt-2.5 mb-0 text-[15px] leading-[1.45] text-pretty text-ink-muted md:text-[17px]">
              {copy.lead}
            </p>
            <ChipRow label="Filter by status" className="md:mt-[26px] md:mb-7">
              {CHIPS.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={
                    chip.key === "active"
                      ? copy.activeLabel
                      : CHIP_LABEL[chip.key]
                  }
                  icon={chip.icon}
                  iconStrokeWidth={chip.stroke}
                  active={filter === chip.key}
                  onSelect={() => setFilter(chip.key)}
                  className="h-11 md:h-[46px]"
                />
              ))}
            </ChipRow>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn(
              "mb-[18px] h-10 items-center gap-1.5 rounded-full border border-solid border-[rgba(47,70,54,.08)] bg-surface pr-4 pl-2.5 text-sm font-semibold whitespace-nowrap text-forest",
              open ? "hidden md:flex lg:hidden" : "hidden",
            )}
          >
            <Icon name="chevronLeft" size={18} />
            All requests
          </button>

          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,1fr)]">
            <div
              className={cn(
                "min-w-0 flex-col gap-3 md:gap-3.5",
                open ? "hidden lg:flex" : "flex",
              )}
            >
              {data.requests === undefined ? (
                <p
                  role="status"
                  className="m-0 py-10 text-center text-ink-soft"
                >
                  Loading your requests…
                </p>
              ) : null}
              {rows.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  today={today}
                  selected={request.id === current?.id}
                  onSelect={() => {
                    setSelectedId(request.id);
                    setOpen(true);
                  }}
                />
              ))}
              {data.requests !== undefined && rows.length === 0 ? (
                <EmptyState
                  title="No requests here"
                  description="Requests with this status will show up in this list."
                  className="rounded-card bg-surface px-6 py-14"
                  titleClassName="text-[17px]"
                  descriptionClassName="mt-2 text-[14.5px]"
                />
              ) : null}
            </div>

            {current ? (
              <div className={open ? "min-w-0" : "hidden min-w-0 lg:block"}>
                <RequestDetail
                  request={current}
                  today={today}
                  onAction={(type) => onAction(current, type)}
                  canAct={
                    data.canAct
                      ? (type) => data.canAct?.(current, type) ?? true
                      : undefined
                  }
                />
              </div>
            ) : null}
          </div>
        </main>
      </RequireAuth>

      {!open ? <MobileBottomNav active={copy.nav} /> : null}

      <Dialog
        open={Boolean(modal && modalRequest)}
        onClose={() => setModal(null)}
        label={
          modal?.kind === "address"
            ? "Pickup details"
            : modal?.kind === "approve"
              ? "Approve request"
              : "Cancel"
        }
      >
        {modal && modalRequest ? (
          <LoanModalContent
            kind={modal.kind}
            request={modalRequest}
            today={today}
            busy={busy}
            onClose={() => setModal(null)}
            onConfirm={(pickupNote) =>
              void run(() =>
                modal.kind === "approve"
                  ? data.onAction(modalRequest, "approve", { pickupNote })
                  : data.cancel(modalRequest),
              )
            }
          />
        ) : null}
      </Dialog>

      <Toast
        message={toast.message}
        className={cn(open ? "bottom-[120px]" : "bottom-[92px]", "md:bottom-8")}
      />
    </div>
  );
}

const NOTE_MAX = 200;

function LoanModalContent({
  kind,
  request,
  today,
  busy,
  onClose,
  onConfirm,
}: {
  kind: ModalKind;
  request: LoanView;
  today: Date;
  busy: boolean;
  onClose: () => void;
  onConfirm: (pickupNote?: string) => void;
}) {
  const { first, start, end, person, itemName } = requestContext(
    request,
    today,
  );
  const [note, setNote] = useState("");
  const isLoan = request.status !== "pending";
  const range = `${formatShort(start)} – ${formatShort(end)}`;
  const item = itemName.toLowerCase();

  const icon: IconName =
    kind === "cancel" ? "ban" : kind === "approve" ? "check" : "pin";
  return (
    <>
      <div
        className={cn(
          "flex size-[52px] items-center justify-center rounded-full",
          kind === "cancel"
            ? "bg-danger-bg text-danger"
            : "bg-lavender text-primary",
        )}
      >
        <Icon name={icon} size={26} />
      </div>
      <h3 className="mt-[18px] mb-0 text-[22px] font-extrabold tracking-tight text-forest">
        {kind === "cancel"
          ? isLoan
            ? "Cancel this loan?"
            : "Cancel this request?"
          : kind === "approve"
            ? "Approve this request?"
            : "Pickup details"}
      </h3>
      <p className="mt-2.5 mb-0 text-[15px] leading-normal text-pretty text-ink-muted">
        {kind === "cancel"
          ? isLoan
            ? `${range} will be released for other neighbours. The loan stays in your history.`
            : `Your request for ${range} will be withdrawn. It stays in your history.`
          : kind === "approve"
            ? `${first} can then collect the ${item} for ${range}. Other pending requests for these dates will be declined.`
            : `Collect the ${item} from ${first} on ${formatShort(start)}.`}
      </p>
      {kind === "address" ? (
        <div className="mt-4 rounded-[14px] border border-solid border-[rgba(47,70,54,.08)] bg-hover-sage p-4">
          <div className="text-base font-bold text-forest">
            {person.pickupArea} · approximate area
          </div>
          <div className="mt-1 text-sm whitespace-pre-line text-ink-muted">
            {request.pickupNote ??
              `${first} didn’t add a pickup note. Arrange the pickup with them.`}
          </div>
        </div>
      ) : null}
      {kind === "approve" ? (
        <label className="mt-4 flex flex-col gap-2 text-[14.5px] font-bold text-forest">
          <span>
            Pickup note for {first}{" "}
            <span className="block text-[13.5px] font-medium text-ink-soft">
              Optional · only {first} sees it. Don’t share your exact address
              here unless you want to.
            </span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder="e.g. Ring at the blue door, weekdays after 6 pm."
            className="box-border w-full resize-none rounded-field border border-solid border-[rgba(47,70,54,.18)] bg-white px-3.5 py-3 font-sans text-[15px] leading-[1.45] font-normal text-forest outline-none focus:border-primary focus:shadow-focus"
          />
        </label>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Button
          variant="neutral"
          onClick={onClose}
          className="min-h-[50px] flex-[1_1_140px] text-[15px] font-bold"
        >
          {kind === "address"
            ? "Close"
            : kind === "approve"
              ? "Back"
              : isLoan
                ? "Keep loan"
                : "Keep request"}
        </Button>
        {kind === "cancel" ? (
          <Button
            variant="danger"
            onClick={() => onConfirm()}
            disabled={busy}
            className="min-h-[50px] flex-[1_1_160px] text-[15px] font-bold"
          >
            {isLoan ? "Yes, cancel loan" : "Yes, cancel request"}
          </Button>
        ) : null}
        {kind === "approve" ? (
          <Button
            onClick={() => onConfirm(note.trim() || undefined)}
            disabled={busy}
            className="min-h-[50px] flex-[1_1_160px] text-[15px] font-bold"
          >
            Approve
          </Button>
        ) : null}
      </div>
    </>
  );
}
