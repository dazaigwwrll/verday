/* ============================================================
   Recurrence rules → which dates they fall on. Jalali-aware
   (weekday 0 = Saturday; monthly uses Jalali day-of-month).
   ============================================================ */

import type { Recurrence } from "../domain/types";
import { jalaliParts, parse, todayISO } from "./date";

export function recurrenceMatches(rec: Recurrence, iso: string): boolean {
  const { jd, weekday } = jalaliParts(iso);
  switch (rec.freq) {
    case "daily":
      return true;
    case "weekly":
      return (rec.weekdays ?? []).includes(weekday);
    case "monthly":
      return rec.monthDay != null && jd === rec.monthDay;
    default:
      return false;
  }
}

export const RECUR_WINDOW = 14; // days ahead to materialize

/** ISO dates from today through the next RECUR_WINDOW days. */
export function recurWindowDates(): string[] {
  const start = parse(todayISO());
  return Array.from({ length: RECUR_WINDOW }, (_, i) =>
    start.add(i, "day").format("YYYY-MM-DD")
  );
}
