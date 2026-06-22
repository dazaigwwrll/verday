/* ============================================================
   Week board — the whole week at a glance: a quick add + task
   list per day, plus this week's goals overview. Tasks can be
   attached to a weekly goal, so completing them rolls the goal
   forward (roll-up lives in GoalSection).

   Tasks can be dragged between days via a grip handle. Dragging
   uses Pointer Events, so it works with mouse, touch and pen
   (native HTML5 drag-and-drop doesn't work on touch screens).
   ============================================================ */

import { useEffect, useState } from "react";
import { GoalSection } from "../components/GoalSection";
import { Icon } from "../components/Icon";
import { useStore } from "../domain/store";
import { PRIORITY_WEIGHT, type Goal, type Task } from "../domain/types";
import {
  weekStartISO,
  addDays,
  todayISO,
  formatWeekRange,
  relativeDayLabel,
  jalaliParts,
  jalaliMonthStartISO,
  toFaDigits,
} from "../lib/date";
import { useI18n } from "../i18n";

function byPriorityThenTime(a: Task, b: Task) {
  const pa = PRIORITY_WEIGHT[a.priority ?? "med"];
  const pb = PRIORITY_WEIGHT[b.priority ?? "med"];
  if (pa !== pb) return pb - pa;
  return (a.startTime ?? "99").localeCompare(b.startTime ?? "99");
}

type DragHandler = (task: Task, e: React.PointerEvent) => void;

/** Compact task line for the dense week board. */
function WeekTask({
  task,
  onDragStart,
  dragging,
}: {
  task: Task;
  onDragStart: DragHandler;
  dragging: boolean;
}) {
  const { state, toggleTask, removeTask } = useStore();
  const { t } = useI18n();
  const goal = task.goalId
    ? state.goals.find((g) => g.id === task.goalId)
    : undefined;
  return (
    <div className={"wk-task" + (task.done ? " done" : "") + (dragging ? " dragging" : "")}>
      <button
        className="wk-grip"
        onPointerDown={(e) => onDragStart(task, e)}
        aria-label={t("week.drag")}
        title={t("week.drag")}
      >
        <Icon name="grip" size={16} />
      </button>
      <button
        className={"checkbox sm" + (task.done ? " on" : "")}
        onClick={() => toggleTask(task.id)}
        aria-label={t("common.add")}
      >
        <Icon name="check" size={11} />
      </button>
      <div className="wk-task-main">
        <span className="wk-task-title">{task.title}</span>
        <span className="wk-task-metas">
          {task.startTime && (
            <span className="wk-task-time tnum">{toFaDigits(task.startTime)}</span>
          )}
          {goal && (
            <span className="goal-chip sm">
              <Icon name="target-sm" size={10} />
              {goal.title}
            </span>
          )}
        </span>
      </div>
      <button
        className="row-del"
        onClick={() => removeTask(task.id)}
        aria-label={t("common.delete")}
      >
        <Icon name="trash" size={13} />
      </button>
    </div>
  );
}

function DayColumn({
  date,
  attachable,
  onDragStart,
  draggingId,
  over,
}: {
  date: string;
  attachable: Goal[];
  onDragStart: DragHandler;
  draggingId: string | null;
  over: boolean;
}) {
  const { state, addTask } = useStore();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [goalId, setGoalId] = useState("");

  const tasks = state.tasks
    .filter((x) => x.date === date)
    .sort(byPriorityThenTime);
  const doneCount = tasks.filter((x) => x.done).length;
  const isToday = date === todayISO();
  const { jd } = jalaliParts(date);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = title.trim();
    if (!v) return;
    addTask({ title: v, date, goalId: goalId || undefined });
    setTitle("");
    setGoalId("");
  };

  return (
    <div
      data-day={date}
      className={
        "week-day" + (isToday ? " today" : "") + (over ? " drop-over" : "")
      }
    >
      <div className="week-day-head">
        <span className="week-day-name">{relativeDayLabel(date)}</span>
        <span className="week-day-meta tnum subtle">
          {tasks.length > 0 && (
            <span className="week-day-count">
              {toFaDigits(doneCount)}/{toFaDigits(tasks.length)}
            </span>
          )}
          <span className="week-day-num">{toFaDigits(jd)}</span>
        </span>
      </div>

      <div className="week-day-list">
        {tasks.length === 0 ? (
          <p className="week-day-empty subtle">{t("week.dayEmpty")}</p>
        ) : (
          tasks.map((tk) => (
            <WeekTask
              key={tk.id}
              task={tk}
              onDragStart={onDragStart}
              dragging={draggingId === tk.id}
            />
          ))
        )}
      </div>

      <form className="week-day-add" onSubmit={submit}>
        <div className="week-day-add-row">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("today.addTask")}
          />
          <button className="icon-btn sm" type="submit" aria-label={t("common.add")}>
            <Icon name="plus" size={16} />
          </button>
        </div>
        {attachable.length > 0 && title.trim() && (
          <select
            className="goal-select sm"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
          >
            <option value="">{t("today.noGoal")}</option>
            {attachable.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        )}
      </form>
    </div>
  );
}

interface DragState {
  task: Task;
  x: number;
  y: number;
}

export default function Week() {
  const { state, postponeTask } = useStore();
  const { t } = useI18n();
  const [offset, setOffset] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);

  const weekStart = weekStartISO(addDays(todayISO(), offset * 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  const { jy, jm } = jalaliParts(weekStart);
  const monthStart = jalaliMonthStartISO(jy, jm);
  const yearStart = jalaliMonthStartISO(jy, 1);

  const attachable = state.goals.filter(
    (g) =>
      !g.parentId &&
      ((g.scope === "week" && g.periodStart === weekStart) ||
        (g.scope === "month" && g.periodStart === monthStart) ||
        (g.scope === "year" && g.periodStart === yearStart))
  );

  const weekTasks = state.tasks.filter(
    (x) => x.date >= weekStart && x.date <= weekEnd
  );
  const done = weekTasks.filter((x) => x.done).length;

  const startDrag: DragHandler = (task, e) => {
    e.preventDefault();
    setDrag({ task, x: e.clientX, y: e.clientY });
    setOverDate(null);
  };

  // Pointer-move/up listeners live only while a drag is active.
  useEffect(() => {
    if (!drag) return;
    const dayAt = (x: number, y: number): string | null => {
      const el = document.elementFromPoint(x, y);
      const day = el?.closest("[data-day]");
      return day?.getAttribute("data-day") ?? null;
    };
    const onMove = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
      setOverDate(dayAt(e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      const target = dayAt(e.clientX, e.clientY);
      setDrag((d) => {
        if (d && target && target !== d.task.date) postponeTask(d.task.id, target);
        return null;
      });
      setOverDate(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, postponeTask]);

  return (
    <>
      <header className="page-header">
        <h2>
          <Icon name="week" size={22} /> {t("week.title")}
        </h2>
        <p className="sub">{t("week.subtitle")}</p>
      </header>

      <div className="period-nav week-nav">
        <button
          className="period-arrow"
          onClick={() => setOffset((o) => o - 1)}
          aria-label={t("goals.prev")}
        >
          <Icon name="chevron" size={18} className="arrow-prev" />
        </button>
        <div className="period-center">
          <span className="period-label">{formatWeekRange(weekStart)}</span>
          {offset !== 0 && (
            <button className="period-now" onClick={() => setOffset(0)}>
              {t("goals.now")}
            </button>
          )}
        </div>
        <button
          className="period-arrow"
          onClick={() => setOffset((o) => o + 1)}
          aria-label={t("goals.next")}
        >
          <Icon name="chevron" size={18} className="arrow-next" />
        </button>
      </div>

      <section className="card week-overview">
        <div className="widget-head">
          <h3>
            <Icon name="target" size={18} /> {t("week.goalsTitle")}
          </h3>
          {weekTasks.length > 0 && (
            <span className="muted">
              {t("week.tasksSummary", {
                done: toFaDigits(done),
                total: toFaDigits(weekTasks.length),
              })}
            </span>
          )}
        </div>
        <GoalSection
          scope="week"
          periodStart={weekStart}
          placeholder={t("goals.addWeek")}
        />
      </section>

      <div className="week-grid">
        {days.map((d) => (
          <DayColumn
            key={d}
            date={d}
            attachable={attachable}
            onDragStart={startDrag}
            draggingId={drag?.task.id ?? null}
            over={!!drag && overDate === d}
          />
        ))}
      </div>

      {drag && (
        <div
          className="drag-ghost"
          style={{ left: drag.x, top: drag.y }}
        >
          <Icon name="grip" size={14} />
          <span>{drag.task.title}</span>
        </div>
      )}
    </>
  );
}
