/* ============================================================
   Goal list for a scope + period, with full cascade:
   year → month → week → day. A goal can auto-split (year→12
   months, month→its weeks) or take manual sub-goals, and shows
   roll-up progress from its children (or linked tasks).
   Sub-goals are themselves GoalItems, so the breakdown nests.
   ============================================================ */

import { useState } from "react";
import { useStore } from "../domain/store";
import type { Goal, GoalScope } from "../domain/types";
import { Icon } from "./Icon";
import {
  JALALI_MONTHS,
  jalaliParts,
  jalaliMonthStartISO,
  jalaliMonthWeekStarts,
  weekStartISO,
  formatWeekRange,
  toFaDigits,
} from "../lib/date";
import { useI18n } from "../i18n";
import { useConfirm } from "./Confirm";

/** The scope one level below a given scope (cascade). */
const CHILD_SCOPE: Record<GoalScope, GoalScope | null> = {
  year: "month",
  month: "week",
  week: "day",
  day: null,
};

function GoalItem({ goal, depth = 0 }: { goal: Goal; depth?: number }) {
  const { state, addGoal, toggleGoal, removeGoal, updateGoal } = useStore();
  const { t } = useI18n();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.title);

  const childScope = CHILD_SCOPE[goal.scope];

  const saveTitle = () => {
    const v = draft.trim();
    if (v && v !== goal.title) updateGoal(goal.id, { title: v });
    setEditing(false);
  };

  const children = state.goals.filter((g) => g.parentId === goal.id);
  const linked = state.tasks.filter((t) => t.goalId === goal.id);

  // roll-up: prefer sub-goals, else linked tasks
  const prog =
    children.length > 0
      ? { done: children.filter((c) => c.done).length, total: children.length }
      : linked.length > 0
      ? { done: linked.filter((t) => t.done).length, total: linked.length }
      : null;
  const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;

  /** periodStart for a manual sub-goal, in the child scope. */
  const childPeriodStart = (): string => {
    if (goal.scope === "month") return weekStartISO(goal.periodStart);
    return goal.periodStart; // year→month and week→day reuse the parent's start
  };

  const addSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sub.trim() || !childScope) return;
    addGoal({
      title: sub.trim(),
      scope: childScope,
      periodStart: childPeriodStart(),
      parentId: goal.id,
    });
    setSub("");
  };

  const splitIntoMonths = () => {
    const { jy } = jalaliParts(goal.periodStart);
    for (let m = 1; m <= 12; m++) {
      addGoal({
        title: `${goal.title} — ${JALALI_MONTHS[m - 1]}`,
        scope: "month",
        periodStart: jalaliMonthStartISO(jy, m),
        parentId: goal.id,
      });
    }
    setOpen(true);
  };

  const splitIntoWeeks = () => {
    const { jy, jm } = jalaliParts(goal.periodStart);
    const starts = jalaliMonthWeekStarts(jy, jm);
    starts.forEach((ws) =>
      addGoal({
        title: `${goal.title} — ${formatWeekRange(ws)}`,
        scope: "week",
        periodStart: ws,
        parentId: goal.id,
      })
    );
    setOpen(true);
  };

  const canExpand = childScope !== null;

  return (
    <div className={"goal-block depth-" + depth}>
      <div className={"item goal-item" + (goal.done ? " done" : "")}>
        <button
          className={"checkbox" + (goal.done ? " on" : "")}
          onClick={() => toggleGoal(goal.id)}
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
                  setDraft(goal.title);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span
              className="item-title editable"
              onClick={() => {
                setDraft(goal.title);
                setEditing(true);
              }}
              title={t("common.edit")}
            >
              {goal.title}
            </span>
          )}
          {prog && (
            <span className="goal-task-progress">
              <span className="bar mini">
                <span
                  className={"bar-fill" + (pct === 100 ? " success" : "")}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="tnum subtle">
                {toFaDigits(prog.done)}/{toFaDigits(prog.total)}
              </span>
            </span>
          )}
        </div>
        {canExpand && (
          <button
            className={"row-icon" + (open ? " open" : "")}
            onClick={() => setOpen((o) => !o)}
            aria-label={t("goals.cascade")}
            title={t("goals.cascade")}
          >
            <Icon name="chevron" size={16} />
          </button>
        )}
        <button
          className="row-del"
          onClick={async () => {
            if (await confirm(t("confirm.deleteGoal"))) removeGoal(goal.id);
          }}
          aria-label={t("common.delete")}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      {open && canExpand && (
        <div className="subgoals">
          {goal.scope === "year" && (
            <button className="btn split-btn" onClick={splitIntoMonths}>
              <Icon name="layers" size={15} /> {t("goals.splitMonths")}
            </button>
          )}
          {goal.scope === "month" && (
            <button className="btn split-btn" onClick={splitIntoWeeks}>
              <Icon name="layers" size={15} /> {t("goals.splitWeeks")}
            </button>
          )}
          {children.map((c) => (
            <GoalItem key={c.id} goal={c} depth={depth + 1} />
          ))}
          <form className="subtask-add" onSubmit={addSub}>
            <Icon name="plus" size={14} />
            <input
              type="text"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              placeholder={t("goals.newSub")}
            />
          </form>
        </div>
      )}
    </div>
  );
}

export function GoalSection({
  scope,
  periodStart,
  placeholder,
}: {
  scope: GoalScope;
  periodStart: string;
  placeholder: string;
}) {
  const { state, addGoal } = useStore();
  const { t } = useI18n();
  const [title, setTitle] = useState("");

  // top-level goals for this scope/period (exclude sub-goals)
  const goals = state.goals.filter(
    (g) => g.scope === scope && g.periodStart === periodStart && !g.parentId
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = title.trim();
    if (!v) return;
    addGoal({ title: v, scope, periodStart });
    setTitle("");
  };

  return (
    <>
      <form className="add-row" onSubmit={submit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
        />
        <button type="submit" className="btn btn-primary">
          <Icon name="plus" size={18} />
          {t("common.add")}
        </button>
      </form>

      {goals.length === 0 ? (
        <div className="empty">
          <Icon name="sparkle" size={22} />
          <span>{t("goals.empty")}</span>
        </div>
      ) : (
        <div className="list">
          {goals.map((g) => (
            <GoalItem key={g.id} goal={g} />
          ))}
        </div>
      )}
    </>
  );
}
