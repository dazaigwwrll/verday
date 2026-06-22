/* ============================================================
   Conflict-safe merge of two planner states.

   Used only when BOTH this device and the server changed since
   the last sync. The guiding rule is "never silently lose data":
   - id-keyed collections (goals/tasks/habits/…) are unioned by id;
     when the same id exists on both sides the newer `updatedAt`
     wins (falling back to keeping the local copy).
   - date-keyed logs are merged field by field, preferring filled
     values so a half-entry on one device can't wipe the other.
   - habit check-offs are unioned per day.

   This is best-effort and symmetric enough for a single user with
   a few devices. Hard conflicts (the very same field edited on two
   devices at once) resolve to the newer write.
   ============================================================ */

import type {
  DailyLog,
  Goal,
  PlannerState,
  Task,
} from "../domain/types";

function byId<T extends { id: string; updatedAt?: string }>(
  a: T[],
  b: T[]
): T[] {
  const out = new Map<string, T>();
  for (const item of a) out.set(item.id, item);
  for (const item of b) {
    const prev = out.get(item.id);
    if (!prev) {
      out.set(item.id, item);
    } else if ((item.updatedAt ?? "") > (prev.updatedAt ?? "")) {
      out.set(item.id, item);
    }
  }
  return [...out.values()];
}

function mergeDaily(a: DailyLog[], b: DailyLog[]): DailyLog[] {
  const out = new Map<string, DailyLog>();
  for (const l of a) out.set(l.date, l);
  for (const l of b) {
    const prev = out.get(l.date);
    if (!prev) {
      out.set(l.date, l);
      continue;
    }
    out.set(l.date, {
      date: l.date,
      mood: l.mood ?? prev.mood,
      // keep the longer gratitude list (the one with more entries)
      gratitude:
        (l.gratitude?.length ?? 0) >= (prev.gratitude?.length ?? 0)
          ? l.gratitude ?? []
          : prev.gratitude ?? [],
      water: Math.max(prev.water ?? 0, l.water ?? 0),
      sleepStart: l.sleepStart ?? prev.sleepStart,
      sleepEnd: l.sleepEnd ?? prev.sleepEnd,
    });
  }
  return [...out.values()];
}

function unionDays(
  a: Record<string, string[]>,
  b: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[key] = [...new Set([...(a[key] ?? []), ...(b[key] ?? [])])];
  }
  return out;
}

function mergeStringMap(
  a: Record<string, string>,
  b: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    // prefer the longer text when both have an entry for the same key
    if (!out[k] || v.length > out[k].length) out[k] = v;
  }
  return out;
}

/** Merge `local` and `remote` into one state with no data loss. */
export function mergeStates(
  local: PlannerState,
  remote: PlannerState
): PlannerState {
  return {
    goals: byId<Goal>(local.goals, remote.goals),
    tasks: byId<Task>(local.tasks, remote.tasks),
    occasions: byId(local.occasions, remote.occasions),
    dailyLogs: mergeDaily(local.dailyLogs, remote.dailyLogs),
    habits: byId(local.habits, remote.habits),
    habitDays: unionDays(local.habitDays, remote.habitDays),
    recurrences: byId(local.recurrences, remote.recurrences),
    skips: { ...remote.skips, ...local.skips },
    reviews: mergeStringMap(remote.reviews, local.reviews),
  };
}

/** Cheap stable fingerprint of a state, to detect local changes
 *  since the last sync without storing a full copy. */
export function fingerprint(state: PlannerState): string {
  const json = JSON.stringify(state);
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = (h * 33) ^ json.charCodeAt(i);
  }
  // unsigned hex
  return (h >>> 0).toString(16);
}
