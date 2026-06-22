/* ============================================================
   Task row — check, priority, time + goal chip, subtasks
   checklist, estimate, and a postpone (موکول) menu.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { useStore } from "../domain/store";
import { type Task, type TaskPriority } from "../domain/types";
import { Icon } from "./Icon";
import { PriorityMark } from "./PriorityMark";
import { dayjs, todayISO, toFaDigits } from "../lib/date";
import { isTimed, actualMinutes, pacing } from "../lib/tracking";
import { useI18n } from "../i18n";
import { usePrefs } from "../prefs";

const NEXT_PRIORITY: Record<TaskPriority, TaskPriority> = {
  low: "med",
  med: "high",
  high: "low",
};

export function TaskRow({ task }: { task: Task }) {
  const {
    state,
    toggleTask,
    setPriority,
    startTask,
    finishTask,
    resetTracking,
    removeTask,
    postponeTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    removeSubtask,
    setTaskNotes,
    addTaskTag,
    removeTaskTag,
  } = useStore();
  const { t } = useI18n();
  const { paceMode } = usePrefs();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [notesDraft, setNotesDraft] = useState(task.notes ?? "");
  const [tagInput, setTagInput] = useState("");
  const [, tick] = useState(0);

  const allTags = Array.from(
    new Set(state.tasks.flatMap((x) => x.tags ?? []))
  ).sort();
  const tags = task.tags ?? [];

  const addTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    addTaskTag(task.id, tagInput);
    setTagInput("");
  };

  const saveTitle = () => {
    const v = draft.trim();
    if (v && v !== task.title) updateTask(task.id, { title: v });
    setEditing(false);
  };
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const priority: TaskPriority = task.priority ?? "med";
  const goal = task.goalId
    ? state.goals.find((g) => g.id === task.goalId)
    : undefined;
  const overdue = !task.done && task.date < todayISO();
  const subs = task.subtasks ?? [];
  const subDone = subs.filter((s) => s.done).length;

  const timed = isTimed(task);
  const inProgress = !!task.actualStart && !task.actualEnd;
  const finished = !!task.actualStart && !!task.actualEnd;
  const elapsed = inProgress ? actualMinutes(task, Date.now()) ?? 0 : 0;
  const pace = finished ? pacing(task, paceMode) : null;

  // keep the running timer fresh while a task is in progress
  useEffect(() => {
    if (!inProgress) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [inProgress]);

  const move = (toDate: string) => {
    postponeTask(task.id, toDate);
    setMenu(false);
  };
  const rel = (days: number) =>
    dayjs(todayISO()).add(days, "day").format("YYYY-MM-DD");

  const addSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subInput.trim()) return;
    addSubtask(task.id, subInput);
    setSubInput("");
  };

  return (
    <div className={"task-wrap" + (menu ? " menu-open" : "")}>
      <div
        className={
          "item" +
          (task.done ? " done" : "") +
          (priority === "high" && !task.done ? " important" : "") +
          (overdue ? " overdue" : "")
        }
      >
        <button
          className={"checkbox" + (task.done ? " on" : "")}
          onClick={() => toggleTask(task.id)}
          aria-label={t("common.add")}
        >
          <Icon name="check" size={14} />
        </button>

        <div className="item-main">
          {editing ? (
            <input
              className="title-edit"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setDraft(task.title);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span
              className="item-title editable"
              onClick={() => {
                setDraft(task.title);
                setEditing(true);
              }}
              title={t("common.edit")}
            >
              {task.title}
            </span>
          )}
          <span className="item-metas">
            {(task.startTime || task.endTime) && (
              <span className="item-meta tnum">
                <Icon name="clock" size={13} />
                {toFaDigits(task.startTime ?? "")}
                {task.endTime ? ` – ${toFaDigits(task.endTime)}` : ""}
              </span>
            )}
            {task.estimateMin != null && (
              <span className="item-meta tnum">
                ~{toFaDigits(task.estimateMin)} {t("task.min")}
              </span>
            )}
            {subs.length > 0 && (
              <span className="item-meta tnum">
                <Icon name="list" size={12} />
                {toFaDigits(subDone)}/{toFaDigits(subs.length)}
              </span>
            )}
            {task.recurrenceId && (
              <span className="item-meta">
                <Icon name="repeat" size={12} />
              </span>
            )}
            {goal && (
              <span className="goal-chip">
                <Icon name="target-sm" size={12} />
                {goal.title}
              </span>
            )}
            {inProgress && (
              <span className="track-tag running tnum">
                <span className="pulse-dot" />
                {t("track.running")} · {toFaDigits(elapsed)} {t("task.min")}
              </span>
            )}
            {pace && (
              <span className={"track-tag " + pace.kind}>
                {pace.kind === "onTime"
                  ? t("track.onTime")
                  : t("track." + pace.kind, { m: toFaDigits(pace.diff) })}
              </span>
            )}
            {task.notes && (
              <span className="item-meta" title={task.notes}>
                <Icon name="note" size={12} />
              </span>
            )}
            {tags.map((tg) => (
              <span key={tg} className="tag-chip">
                <Icon name="tag" size={10} />
                {tg}
              </span>
            ))}
            {overdue && <span className="overdue-tag">{t("task.overdue")}</span>}
          </span>
        </div>

        {timed && !inProgress && !finished && !task.done && (
          <button
            className="track-btn start"
            onClick={() => startTask(task.id)}
            aria-label={t("track.start")}
            title={t("track.start")}
          >
            <Icon name="play" size={13} />
          </button>
        )}
        {inProgress && (
          <button
            className="track-btn finish"
            onClick={() => finishTask(task.id)}
            aria-label={t("track.finish")}
            title={t("track.finish")}
          >
            <Icon name="stop" size={13} />
          </button>
        )}
        {finished && (
          <button
            className="row-icon"
            onClick={() => resetTracking(task.id)}
            aria-label={t("track.reset")}
            title={t("track.reset")}
          >
            <Icon name="repeat" size={15} />
          </button>
        )}

        <button
          className={"row-icon" + (open ? " open" : "")}
          onClick={() => setOpen((o) => !o)}
          aria-label={t("task.subtasks")}
          title={t("task.subtasks")}
        >
          <Icon name="chevron" size={16} />
        </button>

        <button
          className="prio-btn"
          onClick={() => setPriority(task.id, NEXT_PRIORITY[priority])}
          aria-label={t("prio." + priority)}
          title={t("prio." + priority)}
        >
          <PriorityMark priority={priority} />
        </button>

        <div className="postpone" ref={ref}>
          <button
            className="row-icon"
            onClick={() => setMenu((m) => !m)}
            aria-label={t("task.postpone")}
            title={t("task.postpone")}
          >
            <Icon name="postpone" size={16} />
          </button>
          {menu && (
            <div className="postpone-menu">
              <span className="menu-title">{t("task.postponeTo")}</span>
              {overdue && (
                <button onClick={() => move(todayISO())}>
                  {t("common.today")}
                </button>
              )}
              <button onClick={() => move(rel(1))}>{t("task.tomorrow")}</button>
              <button onClick={() => move(rel(2))}>{t("task.in2")}</button>
              <button onClick={() => move(rel(3))}>{t("task.in3")}</button>
              <button onClick={() => move(rel(7))}>{t("task.nextWeek")}</button>
              <label className="menu-date">
                {t("task.customDate")}
                <input
                  type="date"
                  onChange={(e) => e.target.value && move(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <button
          className="row-del"
          onClick={() => removeTask(task.id)}
          aria-label={t("common.delete")}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      {open && (
        <div className="subtasks task-details">
          <textarea
            className="task-notes"
            value={notesDraft}
            placeholder={t("task.notesPh")}
            rows={2}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => {
              if (notesDraft !== (task.notes ?? "")) setTaskNotes(task.id, notesDraft);
            }}
          />

          <div className="task-tags">
            {tags.map((tg) => (
              <span key={tg} className="tag-chip removable">
                <Icon name="tag" size={10} />
                {tg}
                <button
                  className="tag-x"
                  onClick={() => removeTaskTag(task.id, tg)}
                  aria-label={t("common.delete")}
                >
                  <Icon name="plus" size={11} className="rot45" />
                </button>
              </span>
            ))}
            <form className="tag-add" onSubmit={addTag}>
              <Icon name="tag" size={12} />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder={t("task.addTag")}
                list="all-tags"
              />
              <datalist id="all-tags">
                {allTags.map((tg) => (
                  <option key={tg} value={tg} />
                ))}
              </datalist>
            </form>
          </div>

          {subs.map((s) => (
            <div key={s.id} className={"subtask" + (s.done ? " done" : "")}>
              <button
                className={"checkbox sm" + (s.done ? " on" : "")}
                onClick={() => toggleSubtask(task.id, s.id)}
                aria-label={t("common.add")}
              >
                <Icon name="check" size={11} />
              </button>
              <span className="subtask-title">{s.title}</span>
              <button
                className="row-del"
                onClick={() => removeSubtask(task.id, s.id)}
                aria-label={t("common.delete")}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
          <form className="subtask-add" onSubmit={addSub}>
            <Icon name="plus" size={14} />
            <input
              type="text"
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              placeholder={t("task.newSub")}
            />
          </form>
        </div>
      )}
    </div>
  );
}
