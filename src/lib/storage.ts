/* ============================================================
   Local-first storage. Single source of truth on-device.
   Versioned so a future sync engine can migrate / merge.
   Swap the backing store (localStorage -> IndexedDB) without
   touching callers.
   ============================================================ */

import { emptyState, type PlannerState } from "../domain/types";

const KEY = "planner.state.v1";

export function loadState(): PlannerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(emptyState);
    const parsed = JSON.parse(raw) as Partial<PlannerState>;
    return {
      goals: parsed.goals ?? [],
      tasks: parsed.tasks ?? [],
      occasions: parsed.occasions ?? [],
      dailyLogs: parsed.dailyLogs ?? [],
      habits: (parsed.habits ?? []).map((h) => ({
        ...h,
        kind: h.kind ?? "build",
      })),
      habitDays: parsed.habitDays ?? {},
      recurrences: parsed.recurrences ?? [],
      skips: parsed.skips ?? {},
      reviews: parsed.reviews ?? {},
    };
  } catch {
    return structuredClone(emptyState);
  }
}

export function saveState(state: PlannerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full / unavailable — swallow for now; sync layer will handle later
  }
}

/** Lightweight unique id (no external dep). */
export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}
