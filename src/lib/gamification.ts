/* ============================================================
   Gamification — points, level and badges are DERIVED from the
   store (not stored separately), so they stay consistent across
   backup/restore and can't drift. Pure functions of state.
   ============================================================ */

import type { PlannerState } from "../domain/types";
import { PRIORITY_WEIGHT } from "../domain/types";

/** Total points earned across all activity. */
export function computePoints(s: PlannerState): number {
  let p = 0;
  for (const t of s.tasks)
    if (t.done) p += 8 + PRIORITY_WEIGHT[t.priority ?? "med"] * 2; // 10 / 12 / 14
  for (const ids of Object.values(s.habitDays)) p += ids.length * 5;
  for (const g of s.goals)
    if (g.done)
      p += g.scope === "year" ? 50 : g.scope === "month" ? 30 : g.scope === "week" ? 20 : 12;
  for (const l of s.dailyLogs) p += (l.gratitude?.length ?? 0) * 2;
  return p;
}

export interface LevelInfo {
  level: number;
  intoLevel: number;
  span: number;
  toNext: number;
}

/** Progressive levels: each level needs ~40% more points than the last. */
export function levelInfo(points: number): LevelInfo {
  let level = 1;
  let need = 100;
  let acc = 0;
  while (points >= acc + need) {
    acc += need;
    level++;
    need = Math.round((need * 1.4) / 10) * 10;
  }
  return { level, intoLevel: points - acc, span: need, toNext: acc + need - points };
}
