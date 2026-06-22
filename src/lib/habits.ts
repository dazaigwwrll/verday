/* ============================================================
   Habit streak math. A "success day" is a day whose cell is
   checked: for a build-habit it means "did it", for a quit-habit
   it means "stayed clean". So the same set logic serves both.
   ============================================================ */

import { dayjs, todayISO } from "./date";

/** True if habitId is marked done on date. */
function isDone(
  habitDays: Record<string, string[]>,
  date: string,
  habitId: string
): boolean {
  return (habitDays[date] ?? []).includes(habitId);
}

/**
 * Current streak: consecutive success days ending at today (or
 * yesterday, so a not-yet-logged today doesn't read as broken).
 */
export function currentStreak(
  habitDays: Record<string, string[]>,
  habitId: string
): number {
  const today = todayISO();
  let cursor = dayjs(today);
  // Anchor at today if done, else yesterday; otherwise streak is 0.
  if (!isDone(habitDays, today, habitId)) {
    cursor = cursor.subtract(1, "day");
    if (!isDone(habitDays, cursor.format("YYYY-MM-DD"), habitId)) return 0;
  }
  let streak = 0;
  while (isDone(habitDays, cursor.format("YYYY-MM-DD"), habitId)) {
    streak += 1;
    cursor = cursor.subtract(1, "day");
  }
  return streak;
}

/** Longest run of consecutive success days ever recorded. */
export function bestStreak(
  habitDays: Record<string, string[]>,
  habitId: string
): number {
  const dates = Object.entries(habitDays)
    .filter(([, ids]) => ids.includes(habitId))
    .map(([d]) => d)
    .sort();
  let best = 0;
  let run = 0;
  let prev: ReturnType<typeof dayjs> | null = null;
  for (const d of dates) {
    const cur = dayjs(d);
    if (prev && cur.diff(prev, "day") === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = cur;
  }
  return best;
}

/** Total number of success days. */
export function totalDays(
  habitDays: Record<string, string[]>,
  habitId: string
): number {
  return Object.values(habitDays).filter((ids) => ids.includes(habitId)).length;
}
