import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

/** Removes photos that were uploaded but never published (after 24 h). */
crons.daily(
  "delete unpublished photo uploads",
  { hourUTC: 3, minuteUTC: 17 },
  internal.uploads.cleanupPendingUploads,
  {},
);

// Borrowed loans whose due date has passed become overdue (Phase 8).
crons.hourly(
  "mark overdue loans",
  { minuteUTC: 5 },
  internal.loans.markOverdueLoans,
  {},
);

export default crons;
