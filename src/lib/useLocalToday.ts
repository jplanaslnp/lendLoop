"use client";

import { useMemo, useSyncExternalStore } from "react";

import { parseIsoDate } from "./dates";
import { toIsoDate } from "./dateRange";

/**
 * The visitor's local calendar date, or null during server rendering (the
 * server doesn't know the visitor's time zone). Re-checked every minute so
 * an open page rolls over at local midnight. Convex re-validates every date
 * against its own clock; this only drives the calendar.
 */
export function useLocalToday(): Date | null {
  const iso = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => (iso ? parseIsoDate(iso) : null), [iso]);
}

/** The browser's IANA time zone, sent with borrow requests. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const snapshot = () => toIsoDate(new Date());
const serverSnapshot = () => null;

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}
