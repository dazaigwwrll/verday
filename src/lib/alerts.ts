/* ============================================================
   Alerts engine — surfaces reminders when goals/tasks are
   incomplete and time is running short. Pure function of state
   plus the current time, so it's easy to test and reuse.
   ============================================================ */

import type { PlannerState } from "../domain/types";
import {
  dayjs,
  jalaliParts,
  jalaliMonthLength,
  jalaliMonthStartISO,
  weekStartISO,
  addDays,
  todayISO,
} from "./date";

export type AlertKind =
  | "overdue"
  | "time"
  | "week"
  | "month"
  | "year"
  | "monthPace"
  | "yearPace"
  | "overplan";

export interface Alert {
  id: string;
  kind: AlertKind;
  to: string;
  /** numeric params for the translated message */
  n?: number;
  d?: number;
  /** pace: percent of period elapsed / percent of goals done */
  ep?: number;
  dp?: number;
  /** overplan reason */
  reasonKind?: "hours" | "tasks";
  reasonValue?: number;
}

const WEEK_WARN_DAYS = 2;
const MONTH_WARN_DAYS = 5;
const YEAR_WARN_DAYS = 30;
/** Pace nudge: ignore the first fifth of a period, then warn once the
 *  share of time gone exceeds the share of goals done by this much. */
const PACE_MIN_ELAPSED = 0.2;
const PACE_BEHIND = 0.2;
const OVERPLAN_TASKS = 10; // too many tasks scheduled for one day
const OVERPLAN_MINUTES = 600; // > 10h of timed tasks in a day

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** nowHHmm defaults to the current wall-clock time "HH:mm". */
export function computeAlerts(
  state: PlannerState,
  nowHHmm?: string
): Alert[] {
  const today = todayISO();
  const { jy, jm, jd } = jalaliParts(today);
  const now = nowHHmm ?? dayjs().format("HH:mm");
  const alerts: Alert[] = [];

  // 1) Tasks left undone on past days.
  const overdue = state.tasks.filter((t) => !t.done && t.date < today);
  if (overdue.length > 0)
    alerts.push({ id: "overdue", kind: "overdue", to: "/", n: overdue.length });

  // 2) Today's tasks whose start time has already passed.
  const timePassed = state.tasks.filter(
    (t) => !t.done && t.date === today && t.startTime && t.startTime < now
  );
  if (timePassed.length > 0)
    alerts.push({ id: "time", kind: "time", to: "/", n: timePassed.length });

  // 2b) Over-planning today — too many tasks or too many timed hours.
  const todayTasks = state.tasks.filter((t) => t.date === today && !t.done);
  const plannedMin = todayTasks
    .filter((t) => t.startTime && t.endTime)
    .reduce((s, t) => s + Math.max(0, minutes(t.endTime!) - minutes(t.startTime!)), 0);
  if (todayTasks.length > OVERPLAN_TASKS || plannedMin > OVERPLAN_MINUTES) {
    const overHours = plannedMin > OVERPLAN_MINUTES;
    alerts.push({
      id: "overplan",
      kind: "overplan",
      to: "/",
      reasonKind: overHours ? "hours" : "tasks",
      reasonValue: overHours
        ? Math.round((plannedMin / 60) * 10) / 10
        : todayTasks.length,
    });
  }

  // 2c) Weekly goals incomplete with the week almost over.
  const weekStart = weekStartISO(today);
  const weekEnd = addDays(weekStart, 6);
  const weekLeft = dayjs(weekEnd).diff(dayjs(today), "day");
  const weekOpen = state.goals.filter(
    (g) => g.scope === "week" && g.periodStart === weekStart && !g.done
  );
  if (weekOpen.length > 0 && weekLeft <= WEEK_WARN_DAYS)
    alerts.push({
      id: "week",
      kind: "week",
      to: "/goals",
      n: weekOpen.length,
      d: weekLeft,
    });

  // 3) Monthly goals — deadline urgency, else a pace nudge.
  const monthLen = jalaliMonthLength(jy, jm);
  const monthStart = jalaliMonthStartISO(jy, jm);
  const monthLeft = monthLen - jd;
  const monthGoals = state.goals.filter(
    (g) => g.scope === "month" && g.periodStart === monthStart && !g.parentId
  );
  const monthOpen = monthGoals.filter((g) => !g.done);
  if (monthGoals.length > 0 && monthOpen.length > 0) {
    if (monthLeft <= MONTH_WARN_DAYS) {
      alerts.push({
        id: "month",
        kind: "month",
        to: "/goals",
        n: monthOpen.length,
        d: monthLeft,
      });
    } else {
      const elapsed = jd / monthLen;
      const doneFrac = (monthGoals.length - monthOpen.length) / monthGoals.length;
      if (elapsed >= PACE_MIN_ELAPSED && elapsed - doneFrac >= PACE_BEHIND)
        alerts.push({
          id: "monthPace",
          kind: "monthPace",
          to: "/goals",
          ep: Math.round(elapsed * 100),
          dp: Math.round(doneFrac * 100),
        });
    }
  }

  // 4) Yearly goals — deadline urgency, else a pace nudge.
  const yearStart = jalaliMonthStartISO(jy, 1);
  const yearEndISO = dayjs(jalaliMonthStartISO(jy, 12))
    .add(jalaliMonthLength(jy, 12) - 1, "day")
    .format("YYYY-MM-DD");
  const yearLen = dayjs(yearEndISO).diff(dayjs(yearStart), "day") + 1;
  const yearElapsed = dayjs(today).diff(dayjs(yearStart), "day") + 1;
  const yearLeft = dayjs(yearEndISO).diff(dayjs(today), "day");
  const yearGoals = state.goals.filter(
    (g) => g.scope === "year" && g.periodStart === yearStart && !g.parentId
  );
  const yearOpen = yearGoals.filter((g) => !g.done);
  if (yearGoals.length > 0 && yearOpen.length > 0) {
    if (yearLeft <= YEAR_WARN_DAYS) {
      alerts.push({
        id: "year",
        kind: "year",
        to: "/goals",
        n: yearOpen.length,
        d: yearLeft,
      });
    } else {
      const elapsed = yearElapsed / yearLen;
      const doneFrac = (yearGoals.length - yearOpen.length) / yearGoals.length;
      if (elapsed >= PACE_MIN_ELAPSED && elapsed - doneFrac >= PACE_BEHIND)
        alerts.push({
          id: "yearPace",
          kind: "yearPace",
          to: "/goals",
          ep: Math.round(elapsed * 100),
          dp: Math.round(doneFrac * 100),
        });
    }
  }

  return alerts;
}
