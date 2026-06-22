/* ============================================================
   Planner store — React context over the local-first state.
   Exposes goals/tasks plus mutators; persists on every change.
   ============================================================ */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { loadState, saveState, uid } from "../lib/storage";
import { todayISO } from "../lib/date";
import {
  emptyDailyLog,
  type DailyLog,
  type Goal,
  type Habit,
  type MoodLevel,
  type Occasion,
  type OccasionKind,
  type PlannerState,
  type Recurrence,
  type SubTask,
  type Task,
} from "./types";
import { recurrenceMatches, recurWindowDates } from "../lib/recurrence";

type Action =
  | { type: "addGoal"; goal: Goal }
  | { type: "updateGoal"; id: string; patch: Partial<Goal> }
  | { type: "removeGoal"; id: string }
  | { type: "addTask"; task: Task }
  | { type: "updateTask"; id: string; patch: Partial<Task> }
  | { type: "removeTask"; id: string }
  | { type: "patchDaily"; date: string; patch: Partial<DailyLog> }
  | { type: "addHabit"; habit: Habit }
  | { type: "removeHabit"; id: string }
  | { type: "toggleHabitDay"; date: string; habitId: string }
  | { type: "addRecurrence"; rec: Recurrence }
  | { type: "removeRecurrence"; id: string }
  | { type: "addOccasion"; occ: Occasion }
  | { type: "removeOccasion"; id: string }
  | { type: "setReview"; week: string; text: string }
  | { type: "skip"; key: string }
  | { type: "materialize"; tasks: Task[] }
  | { type: "replaceAll"; next: PlannerState };

/** Coerce arbitrary imported JSON into a safe PlannerState, filling
 *  any missing pieces so a partial/old backup can't break the app. */
function sanitizeState(data: unknown): PlannerState {
  const d = (data ?? {}) as Partial<PlannerState>;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const obj = (v: unknown): Record<string, never> =>
    v && typeof v === "object" ? (v as Record<string, never>) : {};
  return {
    goals: arr(d.goals),
    tasks: arr(d.tasks),
    occasions: arr(d.occasions),
    dailyLogs: arr(d.dailyLogs),
    habits: arr(d.habits),
    habitDays: obj(d.habitDays),
    recurrences: arr(d.recurrences),
    skips: obj(d.skips),
    reviews: obj(d.reviews),
  };
}

function upsertDaily(
  logs: DailyLog[],
  date: string,
  patch: Partial<DailyLog>
): DailyLog[] {
  const existing = logs.find((l) => l.date === date);
  if (existing) {
    return logs.map((l) => (l.date === date ? { ...l, ...patch } : l));
  }
  return [...logs, { ...emptyDailyLog(date), ...patch }];
}

function reducer(state: PlannerState, action: Action): PlannerState {
  const now = new Date().toISOString();
  switch (action.type) {
    case "addGoal":
      return { ...state, goals: [...state.goals, action.goal] };
    case "updateGoal":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.id ? { ...g, ...action.patch, updatedAt: now } : g
        ),
      };
    case "removeGoal":
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        // also detach tasks that pointed at it
        tasks: state.tasks.map((t) =>
          t.goalId === action.id ? { ...t, goalId: undefined } : t
        ),
      };
    case "addTask":
      return { ...state, tasks: [...state.tasks, action.task] };
    case "updateTask":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch, updatedAt: now } : t
        ),
      };
    case "removeTask":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case "patchDaily":
      return {
        ...state,
        dailyLogs: upsertDaily(state.dailyLogs, action.date, action.patch),
      };
    case "addHabit":
      return { ...state, habits: [...state.habits, action.habit] };
    case "removeHabit": {
      const habitDays: Record<string, string[]> = {};
      for (const [date, ids] of Object.entries(state.habitDays)) {
        const kept = ids.filter((id) => id !== action.id);
        if (kept.length) habitDays[date] = kept;
      }
      return {
        ...state,
        habits: state.habits.filter((h) => h.id !== action.id),
        habitDays,
      };
    }
    case "toggleHabitDay": {
      const ids = state.habitDays[action.date] ?? [];
      const next = ids.includes(action.habitId)
        ? ids.filter((id) => id !== action.habitId)
        : [...ids, action.habitId];
      const habitDays = { ...state.habitDays };
      if (next.length) habitDays[action.date] = next;
      else delete habitDays[action.date];
      return { ...state, habitDays };
    }
    case "addRecurrence":
      return { ...state, recurrences: [...state.recurrences, action.rec] };
    case "removeRecurrence":
      return {
        ...state,
        recurrences: state.recurrences.filter((r) => r.id !== action.id),
      };
    case "addOccasion":
      return { ...state, occasions: [...state.occasions, action.occ] };
    case "removeOccasion":
      return {
        ...state,
        occasions: state.occasions.filter((o) => o.id !== action.id),
      };
    case "setReview": {
      const reviews = { ...state.reviews };
      if (action.text.trim()) reviews[action.week] = action.text;
      else delete reviews[action.week];
      return { ...state, reviews };
    }
    case "skip":
      return { ...state, skips: { ...state.skips, [action.key]: true } };
    case "materialize":
      return { ...state, tasks: [...state.tasks, ...action.tasks] };
    case "replaceAll":
      return action.next;
    default:
      return state;
  }
}

interface StoreContextValue {
  state: PlannerState;
  addGoal: (input: {
    title: string;
    scope: Goal["scope"];
    periodStart: string;
    notes?: string;
    parentId?: string;
  }) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  addTask: (input: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    goalId?: string;
    notes?: string;
    priority?: Task["priority"];
    estimateMin?: number;
  }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  setPriority: (id: string, priority: Task["priority"]) => void;
  /** Time tracking for timed tasks. */
  startTask: (id: string) => void;
  finishTask: (id: string) => void;
  resetTracking: (id: string) => void;
  removeTask: (id: string) => void;
  /** Move a task to another date. */
  postponeTask: (id: string, toDate: string) => void;
  /** Move every undone past task onto the given date. Returns count moved. */
  rescheduleOverdue: (toDate: string) => number;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  removeSubtask: (taskId: string, subId: string) => void;
  setTaskNotes: (taskId: string, notes: string) => void;
  addTaskTag: (taskId: string, tag: string) => void;
  removeTaskTag: (taskId: string, tag: string) => void;
  setEstimate: (taskId: string, minutes: number | undefined) => void;
  addRecurrence: (input: {
    title: string;
    freq: Recurrence["freq"];
    weekdays?: number[];
    monthDay?: number;
    priority?: Task["priority"];
    startTime?: string;
    endTime?: string;
    goalId?: string;
  }) => void;
  removeRecurrence: (id: string) => void;
  dailyLog: (date: string) => DailyLog;
  setMood: (date: string, mood: MoodLevel) => void;
  addGratitude: (date: string, text: string) => void;
  removeGratitude: (date: string, index: number) => void;
  setWater: (date: string, count: number) => void;
  setSleep: (date: string, sleepStart?: string, sleepEnd?: string) => void;
  addHabit: (title: string, kind: Habit["kind"]) => void;
  removeHabit: (id: string) => void;
  toggleHabitDay: (date: string, habitId: string) => void;
  addOccasion: (input: {
    title: string;
    date: string;
    kind: OccasionKind;
    recurring?: boolean;
    holiday?: boolean;
  }) => void;
  removeOccasion: (id: string) => void;
  setReview: (week: string, text: string) => void;
  /** Replace the whole store from an imported backup. Returns false
   *  if the data isn't usable. */
  importState: (data: unknown) => boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo<StoreContextValue>(() => {
    const stamp = () => {
      const now = new Date().toISOString();
      return { createdAt: now, updatedAt: now };
    };
    return {
      state,
      addGoal: (input) => {
        const goal: Goal = {
          id: uid(),
          done: false,
          ...stamp(),
          ...input,
        };
        dispatch({ type: "addGoal", goal });
        return goal;
      },
      updateGoal: (id, patch) => dispatch({ type: "updateGoal", id, patch }),
      toggleGoal: (id) => {
        const g = state.goals.find((x) => x.id === id);
        if (g) dispatch({ type: "updateGoal", id, patch: { done: !g.done } });
      },
      removeGoal: (id) => dispatch({ type: "removeGoal", id }),
      addTask: (input) => {
        const task: Task = {
          id: uid(),
          done: false,
          ...stamp(),
          ...input,
          date: input.date || todayISO(),
        };
        dispatch({ type: "addTask", task });
        return task;
      },
      updateTask: (id, patch) => dispatch({ type: "updateTask", id, patch }),
      toggleTask: (id) => {
        const t = state.tasks.find((x) => x.id === id);
        if (t) dispatch({ type: "updateTask", id, patch: { done: !t.done } });
      },
      setPriority: (id, priority) =>
        dispatch({ type: "updateTask", id, patch: { priority } }),
      startTask: (id) =>
        dispatch({
          type: "updateTask",
          id,
          patch: { actualStart: new Date().toISOString(), actualEnd: undefined },
        }),
      finishTask: (id) =>
        dispatch({
          type: "updateTask",
          id,
          patch: { actualEnd: new Date().toISOString(), done: true },
        }),
      resetTracking: (id) =>
        dispatch({
          type: "updateTask",
          id,
          patch: { actualStart: undefined, actualEnd: undefined, done: false },
        }),
      removeTask: (id) => {
        const t = state.tasks.find((x) => x.id === id);
        if (t?.recurrenceId)
          dispatch({ type: "skip", key: `${t.recurrenceId}|${t.date}` });
        dispatch({ type: "removeTask", id });
      },
      postponeTask: (id, toDate) =>
        dispatch({ type: "updateTask", id, patch: { date: toDate } }),
      rescheduleOverdue: (toDate) => {
        const overdue = state.tasks.filter(
          (t) => !t.done && t.date < toDate
        );
        overdue.forEach((t) =>
          dispatch({ type: "updateTask", id: t.id, patch: { date: toDate } })
        );
        return overdue.length;
      },
      dailyLog: (date) =>
        state.dailyLogs.find((l) => l.date === date) ?? emptyDailyLog(date),
      setMood: (date, mood) => dispatch({ type: "patchDaily", date, patch: { mood } }),
      addGratitude: (date, text) => {
        const t = text.trim();
        if (!t) return;
        const cur =
          state.dailyLogs.find((l) => l.date === date)?.gratitude ?? [];
        dispatch({
          type: "patchDaily",
          date,
          patch: { gratitude: [...cur, t] },
        });
      },
      removeGratitude: (date, index) => {
        const cur =
          state.dailyLogs.find((l) => l.date === date)?.gratitude ?? [];
        dispatch({
          type: "patchDaily",
          date,
          patch: { gratitude: cur.filter((_, i) => i !== index) },
        });
      },
      setWater: (date, count) =>
        dispatch({
          type: "patchDaily",
          date,
          patch: { water: Math.max(0, count) },
        }),
      setSleep: (date, sleepStart, sleepEnd) =>
        dispatch({
          type: "patchDaily",
          date,
          patch: { sleepStart, sleepEnd },
        }),
      addHabit: (title, kind) => {
        const t = title.trim();
        if (!t) return;
        dispatch({
          type: "addHabit",
          habit: {
            id: uid(),
            title: t,
            kind,
            createdAt: new Date().toISOString(),
          },
        });
      },
      removeHabit: (id) => dispatch({ type: "removeHabit", id }),
      toggleHabitDay: (date, habitId) =>
        dispatch({ type: "toggleHabitDay", date, habitId }),
      addOccasion: (input) => {
        const title = input.title.trim();
        if (!title) return;
        dispatch({
          type: "addOccasion",
          occ: { id: uid(), ...input, title },
        });
      },
      removeOccasion: (id) => dispatch({ type: "removeOccasion", id }),
      setReview: (week, text) => dispatch({ type: "setReview", week, text }),
      importState: (data) => {
        if (!data || typeof data !== "object") return false;
        dispatch({ type: "replaceAll", next: sanitizeState(data) });
        return true;
      },
      addSubtask: (taskId, title) => {
        const t = title.trim();
        if (!t) return;
        const task = state.tasks.find((x) => x.id === taskId);
        if (!task) return;
        const sub: SubTask = { id: uid(), title: t, done: false };
        dispatch({
          type: "updateTask",
          id: taskId,
          patch: { subtasks: [...(task.subtasks ?? []), sub] },
        });
      },
      toggleSubtask: (taskId, subId) => {
        const task = state.tasks.find((x) => x.id === taskId);
        if (!task) return;
        dispatch({
          type: "updateTask",
          id: taskId,
          patch: {
            subtasks: (task.subtasks ?? []).map((s) =>
              s.id === subId ? { ...s, done: !s.done } : s
            ),
          },
        });
      },
      removeSubtask: (taskId, subId) => {
        const task = state.tasks.find((x) => x.id === taskId);
        if (!task) return;
        dispatch({
          type: "updateTask",
          id: taskId,
          patch: {
            subtasks: (task.subtasks ?? []).filter((s) => s.id !== subId),
          },
        });
      },
      setEstimate: (taskId, minutes) =>
        dispatch({
          type: "updateTask",
          id: taskId,
          patch: { estimateMin: minutes },
        }),
      setTaskNotes: (taskId, notes) =>
        dispatch({
          type: "updateTask",
          id: taskId,
          patch: { notes: notes.trim() ? notes : undefined },
        }),
      addTaskTag: (taskId, tag) => {
        const tg = tag.trim();
        if (!tg) return;
        const task = state.tasks.find((x) => x.id === taskId);
        if (!task) return;
        const cur = task.tags ?? [];
        if (cur.includes(tg)) return;
        dispatch({
          type: "updateTask",
          id: taskId,
          patch: { tags: [...cur, tg] },
        });
      },
      removeTaskTag: (taskId, tag) => {
        const task = state.tasks.find((x) => x.id === taskId);
        if (!task) return;
        dispatch({
          type: "updateTask",
          id: taskId,
          patch: { tags: (task.tags ?? []).filter((x) => x !== tag) },
        });
      },
      addRecurrence: (input) =>
        dispatch({
          type: "addRecurrence",
          rec: { id: uid(), createdAt: new Date().toISOString(), ...input },
        }),
      removeRecurrence: (id) => dispatch({ type: "removeRecurrence", id }),
    };
  }, [state]);

  // Materialize recurring tasks into the rolling window (skip dismissed /
  // already-present instances). Runs on mount and whenever rules change.
  useEffect(() => {
    if (state.recurrences.length === 0) return;
    const dates = recurWindowDates();
    const existing = new Set(
      state.tasks
        .filter((t) => t.recurrenceId)
        .map((t) => `${t.recurrenceId}|${t.date}`)
    );
    const now = new Date().toISOString();
    const toAdd: Task[] = [];
    for (const rec of state.recurrences) {
      for (const date of dates) {
        const key = `${rec.id}|${date}`;
        if (state.skips[key] || existing.has(key)) continue;
        if (!recurrenceMatches(rec, date)) continue;
        toAdd.push({
          id: uid(),
          title: rec.title,
          date,
          startTime: rec.startTime,
          endTime: rec.endTime,
          goalId: rec.goalId,
          priority: rec.priority,
          estimateMin: rec.estimateMin,
          recurrenceId: rec.id,
          done: false,
          createdAt: now,
          updatedAt: now,
        });
        existing.add(key);
      }
    }
    if (toAdd.length) dispatch({ type: "materialize", tasks: toAdd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.recurrences, state.skips]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
