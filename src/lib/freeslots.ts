/* ============================================================
   Free-time finder — looks at a day's timed tasks and reports
   the empty gaps, and suggests start times that fit a given
   duration. Active window: 08:00–24:00.
   ============================================================ */

import type { Task } from "../domain/types";

const DAY_START = 8 * 60;
const DAY_END = 24 * 60;

export function mins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fmt(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}`;
}

type Span = [number, number];

/** Minutes-since-midnight of an ISO datetime's local clock time. */
function clockMins(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Effective busy window: actual tracked times take priority over the
 *  plan, so the day's free time reflects how things really went. */
function busy(tasks: Task[]): Span[] {
  return tasks
    .map((t): Span | null => {
      const planned =
        t.estimateMin && t.estimateMin > 0
          ? t.estimateMin
          : t.startTime && t.endTime
          ? mins(t.endTime) - mins(t.startTime)
          : 30;
      if (t.actualStart) {
        const s = clockMins(t.actualStart);
        const e = t.actualEnd ? clockMins(t.actualEnd) : s + Math.max(15, planned);
        return [s, Math.max(s + 5, e)];
      }
      if (t.startTime) {
        const s = mins(t.startTime);
        const e = t.endTime ? mins(t.endTime) : s + planned;
        return [s, Math.max(s + 5, e)];
      }
      return null;
    })
    .filter((x): x is Span => x !== null)
    .sort((a, b) => a[0] - b[0]);
}

function merge(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const [s, e] of spans) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

/** Empty gaps in the active window, each ≥ 15 min. */
export function freeSlots(tasks: Task[]): Span[] {
  const merged = merge(busy(tasks));
  const slots: Span[] = [];
  let cursor = DAY_START;
  for (const [s, e] of merged) {
    if (s > cursor) slots.push([cursor, Math.min(s, DAY_END)]);
    cursor = Math.max(cursor, e);
    if (cursor >= DAY_END) break;
  }
  if (cursor < DAY_END) slots.push([cursor, DAY_END]);
  return slots.filter(([s, e]) => e - s >= 15);
}

/** "HH:mm–HH:mm" labels for each free gap. */
export function freeSlotLabels(tasks: Task[]): string[] {
  return freeSlots(tasks).map(([s, e]) => `${fmt(s)}–${fmt(e)}`);
}

/** Up to `max` start times (HH:mm) from gaps big enough for `durationMin`. */
export function suggestStarts(
  tasks: Task[],
  durationMin: number,
  max = 4
): string[] {
  const out: string[] = [];
  for (const [s, e] of freeSlots(tasks)) {
    if (e - s >= durationMin) out.push(fmt(s));
    if (out.length >= max) break;
  }
  return out;
}
