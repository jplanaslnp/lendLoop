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
import { MOCK_CURRENT_USER, MOCK_TODAY } from "@/mocks/people";
import {
  MOCK_OWNER_PICKUP_DETAIL,
  MOCK_PICKUP_NOTE,
  MOCK_REQUESTS,
  type MockRequest,
  type RequestRole,
} from "@/mocks/requests";

import {
  ACTION_TRANSITIONS,
  actionToast,
  FILTERS,
  requestContext,
  type ActionType,
  type FilterKey,
} from "./loanPresentation";
import { RequestCard } from "./RequestCard";
import { RequestDetail } from "./RequestDetail";

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

function nowLabel(): string {
  const d = new Date();
  return `Today · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type ModalState = { kind: "cancel" | "address"; id: string } | null;

/** Borrowing (requests you sent) and Lending (requests you received). */
export function LoansScreen({ role }: { role: RequestRole }) {
  const copy = COPY[role];
  const router = useRouter();
  const toast = useToast(3800);
  const [requests, setRequests] = useState<MockRequest[]>(() =>
    MOCK_REQUESTS.filter((r) => r.role === role).map((r) => ({
      ...r,
      log: { ...r.log },
    })),
  );
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState(requests[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  const statuses = FILTERS[filter];
  const rows = requests.filter((r) => !statuses || statuses.includes(r.status));
  const current = requests.find((r) => r.id === selectedId) ?? requests[0];

  const update = (
    id: string,
    patch: Partial<MockRequest>,
    logKey?: keyof MockRequest["log"],
  ) =>
    setRequests((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              ...patch,
              log: logKey ? { ...r.log, [logKey]: nowLabel() } : r.log,
            }
          : r,
      ),
    );

  const onAction = (request: MockRequest, type: ActionType) => {
    const { first } = requestContext(request, MOCK_TODAY);
    if (type === "details") {
      router.push(ROUTES.tool(request.itemId));
      return;
    }
    if (type === "address" || type === "cancel") {
      setModal({ kind: type, id: request.id });
      return;
    }
    const transition = ACTION_TRANSITIONS[type];
    if (transition)
      update(request.id, { status: transition.status }, transition.logKey);
    const message = actionToast(type, first);
    if (message) toast.show(message);
  };

  const modalRequest = modal
    ? requests.find((r) => r.id === modal.id)
    : undefined;

  const confirmCancel = () => {
    if (!modalRequest) return;
    const { first } = requestContext(modalRequest, MOCK_TODAY);
    update(
      modalRequest.id,
      {
        status: "cancelled",
        previousStatus: modalRequest.status,
        cancelledBy: "you",
      },
      "cancelled",
    );
    setModal(null);
    toast.show(
      `Cancelled · ${first} has been notified and the dates were released.`,
    );
  };

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
              {rows.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  today={MOCK_TODAY}
                  selected={request.id === current?.id}
                  onSelect={() => {
                    setSelectedId(request.id);
                    setOpen(true);
                  }}
                />
              ))}
              {rows.length === 0 ? (
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
                  today={MOCK_TODAY}
                  onAction={(type) => onAction(current, type)}
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
        label={modal?.kind === "address" ? "Pickup address" : "Cancel"}
      >
        {modal && modalRequest ? (
          <LoanModalContent
            kind={modal.kind}
            request={modalRequest}
            onClose={() => setModal(null)}
            onConfirmCancel={confirmCancel}
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

function LoanModalContent({
  kind,
  request,
  onClose,
  onConfirmCancel,
}: {
  kind: "cancel" | "address";
  request: MockRequest;
  onClose: () => void;
  onConfirmCancel: () => void;
}) {
  const { first, start, end, person, itemName } = requestContext(
    request,
    MOCK_TODAY,
  );
  const isLoan = request.role === "received" && request.status !== "pending";
  const range = `${formatShort(start)} – ${formatShort(end)}`;
  const item = itemName.toLowerCase();

  const icon: IconName = kind === "cancel" ? "ban" : "pin";
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
          : "Pickup address"}
      </h3>
      <p className="mt-2.5 mb-0 text-[15px] leading-normal text-pretty text-ink-muted">
        {kind === "cancel"
          ? `${first} will be notified and ${range} will be released for other neighbours. The request stays in your history.`
          : request.role === "sent"
            ? `Collect the ${item} from ${first} on ${formatShort(start)}.`
            : `${first} will collect the ${item} from you on ${formatShort(start)}.`}
      </p>
      {kind === "address" ? (
        <div className="mt-4 rounded-[14px] border border-solid border-[rgba(47,70,54,.08)] bg-hover-sage p-4">
          <div className="text-base font-bold text-forest">
            {request.role === "sent"
              ? `${person.building} · ${MOCK_OWNER_PICKUP_DETAIL}`
              : MOCK_CURRENT_USER.address}
          </div>
          <div className="mt-1 text-sm text-ink-muted">{MOCK_PICKUP_NOTE}</div>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Button
          variant="neutral"
          onClick={onClose}
          className="min-h-[50px] flex-[1_1_140px] text-[15px] font-bold"
        >
          {kind === "address" ? "Close" : isLoan ? "Keep loan" : "Keep request"}
        </Button>
        {kind === "cancel" ? (
          <Button
            variant="danger"
            onClick={onConfirmCancel}
            className="min-h-[50px] flex-[1_1_160px] text-[15px] font-bold"
          >
            {isLoan ? "Yes, cancel loan" : "Yes, cancel request"}
          </Button>
        ) : null}
      </div>
    </>
  );
}
