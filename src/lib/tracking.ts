/* ============================================================
   Time-tracking helpers — planned vs. actual duration for a
   task. "Timed" tasks (those with an estimate or a start/end
   range) can be started and finished; we then compare how long
   they really took against the plan.
   ============================================================ */

import type { Task } from "../domain/types";
import { mins } from "./freeslots";

/** Planned minutes from an estimate, else from a start/end range. */
export function plannedMinutes(t: Task): number | null {
  if (t.estimateMin && t.estimateMin > 0) return t.estimateMin;
  if (t.startTime && t.endTime)
    return Math.max(0, mins(t.endTime) - mins(t.startTime));
  return null;
}

/** A task supports tracking only when it has a planned duration. */
export function isTimed(t: Task): boolean {
  return plannedMinutes(t) != null;
}

/** Minutes elapsed between actual start and end (or `nowMs` if running). */
export function actualMinutes(t: Task, nowMs: number): number | null {
  if (!t.actualStart) return null;
  const start = new Date(t.actualStart).getTime();
  const end = t.actualEnd ? new Date(t.actualEnd).getTime() : nowMs;
  return Math.max(0, Math.round((end - start) / 60000));
}

export type Pacing = { kind: "over" | "under" | "onTime"; diff: number };

/** How forgiving the "on plan" band is — user-chosen in Settings. */
export type PaceMode = "exact" | "normal" | "easy";

/** Tolerance band (minutes) for "on plan", per mode: a share of the
 *  plan, clamped so short tasks aren't impossible and long ones aren't
 *  trivial. */
export function paceTolerance(planned: number, mode: PaceMode): number {
  const cfg = {
    exact: { share: 0.05, floor: 1, cap: 8 },
    normal: { share: 0.1, floor: 3, cap: 15 },
    easy: { share: 0.2, floor: 5, cap: 25 },
  }[mode];
  return Math.min(cfg.cap, Math.max(cfg.floor, Math.round(planned * cfg.share)));
}

/** Compare a finished task's actual time to its plan. */
export function pacing(t: Task, mode: PaceMode = "normal"): Pacing | null {
  const planned = plannedMinutes(t);
  if (planned == null || !t.actualStart || !t.actualEnd) return null;
  const actual = actualMinutes(t, 0);
  if (actual == null) return null;
  const diff = actual - planned;
  const tol = paceTolerance(planned, mode);
  if (Math.abs(diff) <= tol) return { kind: "onTime", diff: 0 };
  return diff > 0 ? { kind: "over", diff } : { kind: "under", diff: -diff };
}
