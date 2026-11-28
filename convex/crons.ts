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

export default crons;
