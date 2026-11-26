import type { PersonId } from "./people";

/**
 * Phase 2 mock borrow requests, copied from the Borrowing/Lending prototype.
 * `sent` = requests the current user made (Borrowing);
 * `received` = requests for the current user's items (Lending).
 */

export type LoanStatus =
  | "pending"
  | "approved"
  | "ready"
  | "borrowed"
  | "overdue"
  | "returnPending"
  | "returned"
  | "declined"
  | "cancelled";

export type RequestRole = "sent" | "received";

export type RequestLogKey =
  | "sent"
  | "approved"
  | "ready"
  | "pickedUp"
  | "returnMarked"
  | "returned"
  | "declined"
  | "cancelled";

export type MockRequest = {
  id: string;
  role: RequestRole;
  /** Mock tool id (see src/mocks/tools.ts). */
  itemId: string;
  personId: PersonId;
  status: LoanStatus;
  /** For cancelled requests: the status before cancellation. */
  previousStatus?: LoanStatus;
  cancelledBy?: "you" | "them";
  start: string;
  end: string;
  log: Partial<Record<RequestLogKey, string>>;
};

export const MOCK_REQUESTS: readonly MockRequest[] = [
  {
    id: "s1",
    role: "sent",
    itemId: "projector",
    personId: "marc",
    status: "approved",
    start: "2026-11-28",
    end: "2026-11-30",
    log: { sent: "Nov 24 · 10:24", approved: "Nov 24 · 14:37" },
  },
  {
    id: "s2",
    role: "sent",
    itemId: "cooler",
    personId: "emma",
    status: "ready",
    start: "2026-11-26",
    end: "2026-11-29",
    log: {
      sent: "Nov 22 · 09:12",
      approved: "Nov 22 · 18:05",
      ready: "Today · 09:40",
    },
  },
  {
    id: "s3",
    role: "sent",
    itemId: "chair",
    personId: "laura",
    status: "pending",
    start: "2026-12-05",
    end: "2026-12-07",
    log: { sent: "Nov 25 · 20:16" },
  },
  {
    id: "s4",
    role: "sent",
    itemId: "tripod",
    personId: "ruben",
    status: "borrowed",
    start: "2026-11-20",
    end: "2026-12-02",
    log: {
      sent: "Nov 17 · 11:02",
      approved: "Nov 17 · 16:40",
      ready: "Nov 20 · 10:02",
      pickedUp: "Nov 20 · 10:05",
    },
  },
  {
    id: "s5",
    role: "sent",
    itemId: "grinder",
    personId: "bruno",
    status: "overdue",
    start: "2026-11-18",
    end: "2026-11-24",
    log: {
      sent: "Nov 15 · 08:30",
      approved: "Nov 15 · 12:11",
      ready: "Nov 18 · 18:20",
      pickedUp: "Nov 18 · 18:24",
    },
  },
  {
    id: "s6",
    role: "sent",
    itemId: "softbox",
    personId: "trevis",
    status: "returnPending",
    start: "2026-11-15",
    end: "2026-11-22",
    log: {
      sent: "Nov 12 · 19:45",
      approved: "Nov 13 · 09:00",
      ready: "Nov 15 · 17:30",
      pickedUp: "Nov 15 · 17:33",
      returnMarked: "Nov 22 · 19:30",
    },
  },
  {
    id: "s7",
    role: "sent",
    itemId: "drill",
    personId: "david",
    status: "returned",
    start: "2026-11-10",
    end: "2026-11-14",
    log: {
      sent: "Nov 7 · 13:10",
      approved: "Nov 7 · 15:22",
      ready: "Nov 10 · 09:15",
      pickedUp: "Nov 10 · 09:18",
      returned: "Nov 14 · 18:20",
    },
  },
  {
    id: "s8",
    role: "sent",
    itemId: "drone",
    personId: "sara",
    status: "declined",
    start: "2026-11-01",
    end: "2026-11-03",
    log: { sent: "Oct 28 · 21:05", declined: "Oct 29 · 11:48" },
  },
  {
    id: "s9",
    role: "sent",
    itemId: "chair",
    personId: "laura",
    status: "cancelled",
    previousStatus: "approved",
    cancelledBy: "you",
    start: "2026-10-10",
    end: "2026-10-12",
    log: {
      sent: "Oct 4 · 10:00",
      approved: "Oct 4 · 12:30",
      cancelled: "Oct 8 · 08:15",
    },
  },
  {
    id: "r1",
    role: "received",
    itemId: "projector",
    personId: "laura",
    status: "pending",
    start: "2026-12-12",
    end: "2026-12-14",
    log: { sent: "Today · 08:52" },
  },
  {
    id: "r2",
    role: "received",
    itemId: "drill",
    personId: "bruno",
    status: "approved",
    start: "2026-11-27",
    end: "2026-11-29",
    log: { sent: "Nov 24 · 17:20", approved: "Nov 24 · 19:02" },
  },
  {
    id: "r3",
    role: "received",
    itemId: "tripod",
    personId: "sara",
    status: "ready",
    start: "2026-11-26",
    end: "2026-11-28",
    log: {
      sent: "Nov 23 · 10:40",
      approved: "Nov 23 · 12:15",
      ready: "Today · 10:05",
    },
  },
  {
    id: "r4",
    role: "received",
    itemId: "cooler",
    personId: "emma",
    status: "borrowed",
    start: "2026-11-23",
    end: "2026-11-30",
    log: {
      sent: "Nov 19 · 09:00",
      approved: "Nov 19 · 10:30",
      ready: "Nov 23 · 18:00",
      pickedUp: "Nov 23 · 18:04",
    },
  },
  {
    id: "r5",
    role: "received",
    itemId: "drone",
    personId: "ruben",
    status: "overdue",
    start: "2026-11-19",
    end: "2026-11-23",
    log: {
      sent: "Nov 16 · 14:00",
      approved: "Nov 16 · 15:10",
      ready: "Nov 19 · 11:00",
      pickedUp: "Nov 19 · 11:06",
    },
  },
  {
    id: "r6",
    role: "received",
    itemId: "softbox",
    personId: "david",
    status: "returnPending",
    start: "2026-11-16",
    end: "2026-11-21",
    log: {
      sent: "Nov 13 · 12:00",
      approved: "Nov 13 · 13:45",
      ready: "Nov 16 · 19:00",
      pickedUp: "Nov 16 · 19:02",
      returnMarked: "Today · 08:10",
    },
  },
  {
    id: "r7",
    role: "received",
    itemId: "grinder",
    personId: "trevis",
    status: "returned",
    start: "2026-11-05",
    end: "2026-11-08",
    log: {
      sent: "Nov 2 · 16:20",
      approved: "Nov 2 · 18:00",
      ready: "Nov 5 · 10:00",
      pickedUp: "Nov 5 · 10:03",
      returned: "Nov 8 · 17:45",
    },
  },
  {
    id: "r9",
    role: "received",
    itemId: "drone",
    personId: "laura",
    status: "declined",
    start: "2026-11-08",
    end: "2026-11-09",
    log: { sent: "Nov 3 · 18:20", declined: "Nov 4 · 09:10" },
  },
  {
    id: "r8",
    role: "received",
    itemId: "chair",
    personId: "marc",
    status: "cancelled",
    previousStatus: "approved",
    cancelledBy: "them",
    start: "2026-11-14",
    end: "2026-11-16",
    log: {
      sent: "Nov 9 · 09:30",
      approved: "Nov 9 · 11:00",
      cancelled: "Nov 12 · 20:40",
    },
  },
];

/** Pickup addresses shown in the "View Pickup Address" modal (design copy). */
export const MOCK_OWNER_PICKUP_DETAIL = "Floor 2, Door 2B";
export const MOCK_PICKUP_NOTE =
  "Main lobby, next to the mailboxes. Only shared with approved neighbours.";
