/* ============================================================
   Domain model — goals (annual/monthly/daily) and tasks.
   Kept UI-agnostic so the same logic can be reused on mobile.
   Dates are Gregorian ISO strings (YYYY-MM-DD); display layer
   converts to Jalali.
   ============================================================ */

export type GoalScope = "year" | "month" | "week" | "day";

export interface Goal {
  id: string;
  title: string;
  notes?: string;
  scope: GoalScope;
  /** ISO date marking the period this goal belongs to:
   *  year  -> first day of that Jalali year
   *  month -> first day of that Jalali month
   *  week  -> the Saturday that starts that week
   *  day   -> that day */
  periodStart: string;
  /** Optional parent goal this one was broken down from. */
  parentId?: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  /** ISO date the task is scheduled for. */
  date: string;
  /** Optional time window within the day (HH:mm). */
  startTime?: string;
  endTime?: string;
  /** Optional goal this task contributes to. */
  goalId?: string;
  /** Priority; undefined is treated as "med". */
  priority?: TaskPriority;
  /** Checklist within the task. */
  subtasks?: SubTask[];
  /** Free-form labels for grouping/filtering (e.g. "درس", "خانه"). */
  tags?: string[];
  /** Estimated effort in minutes. */
  estimateMin?: number;
  /** Time tracking (opt-in, for timed tasks): ISO datetimes for when
   *  work actually started / finished. Compared against the plan. */
  actualStart?: string;
  actualEnd?: string;
  /** If generated from a recurrence, the rule it came from. */
  recurrenceId?: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurFreq = "daily" | "weekly" | "monthly";

/** A template that materializes into Tasks on matching days. */
export interface Recurrence {
  id: string;
  title: string;
  freq: RecurFreq;
  /** weekly: weekdays (0 = Saturday). */
  weekdays?: number[];
  /** monthly: Jalali day-of-month (1..31). */
  monthDay?: number;
  priority?: TaskPriority;
  startTime?: string;
  endTime?: string;
  estimateMin?: number;
  goalId?: string;
  createdAt: string;
}

export type TaskPriority = "low" | "med" | "high";

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 3,
  med: 2,
  low: 1,
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "زیاد",
  med: "متوسط",
  low: "کم",
};

export type OccasionKind =
  | "iran-official"
  | "religious"
  | "world"
  | "personal";

export interface Occasion {
  id: string;
  title: string;
  kind: OccasionKind;
  /** ISO date. For recurring (e.g. personal birthdays) only month/day matter. */
  date: string;
  recurring?: boolean;
  holiday?: boolean;
}

/** 5-level mood scale, worst → best. Rendered as simple line faces. */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export const WATER_GOAL = 8;

/** One per calendar day. Holds mood, gratitude notes, water count. */
export interface DailyLog {
  date: string; // ISO YYYY-MM-DD
  mood?: MoodLevel;
  gratitude: string[];
  water: number;
  /** bedtime / wake time as HH:mm (wake may be next morning). */
  sleepStart?: string;
  sleepEnd?: string;
}

/** "build" = a good habit to grow; "quit" = a habit to break. */
export type HabitKind = "build" | "quit";

export interface Habit {
  id: string;
  title: string;
  kind: HabitKind;
  createdAt: string;
}

export interface PlannerState {
  goals: Goal[];
  tasks: Task[];
  occasions: Occasion[];
  dailyLogs: DailyLog[];
  habits: Habit[];
  /** date ISO -> ids of habits completed that day */
  habitDays: Record<string, string[]>;
  recurrences: Recurrence[];
  /** keys "recurrenceId|date" the user dismissed, so they don't regenerate */
  skips: Record<string, boolean>;
  /** Weekly review reflections, keyed by the week's Saturday ISO. */
  reviews: Record<string, string>;
}

export const emptyState: PlannerState = {
  goals: [],
  tasks: [],
  occasions: [],
  dailyLogs: [],
  habits: [],
  habitDays: {},
  recurrences: [],
  skips: {},
  reviews: {},
};

export function emptyDailyLog(date: string): DailyLog {
  return { date, gratitude: [], water: 0 };
}
