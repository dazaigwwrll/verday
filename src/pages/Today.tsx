import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../domain/store";
import { Icon } from "../components/Icon";
import {
  MoodPicker,
  WaterTracker,
  SleepTracker,
  GratitudeBox,
} from "../components/daily";
import { Alerts } from "../components/Alerts";
import { ProgressBar } from "../components/ProgressBar";
import { TaskRow } from "../components/TaskRow";
import { Timeline } from "../components/Timeline";
import { freeSlotLabels, suggestStarts, fmt, mins } from "../lib/freeslots";
import {
  PRIORITY_WEIGHT,
  type RecurFreq,
  type TaskPriority,
} from "../domain/types";
import {
  formatJalaliFull,
  relativeDayLabel,
  addDays,
  todayISO,
  toFaDigits,
  jalaliParts,
  jalaliMonthStartISO,
  weekStartISO,
  weekdaysShort,
} from "../lib/date";
import { useI18n } from "../i18n";

export default function Today() {
  const { state, addTask, addRecurrence, removeRecurrence } = useStore();
  const { t, lang } = useI18n();
  const sep = lang === "fa" ? "، " : ", ";
  const FREQ_LABEL: Record<RecurFreq, string> = {
    daily: t("today.daily"),
    weekly: t("today.weekly"),
    monthly: t("today.monthly"),
  };
  const [params] = useSearchParams();
  const [date, setDate] = useState(() => {
    const d = params.get("d");
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayISO();
  });
  const { weekday, jd, jy, jm } = jalaliParts(date);
  const monthStart = jalaliMonthStartISO(jy, jm);
  const yearStart = jalaliMonthStartISO(jy, 1);
  const weekStart = weekStartISO(date);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [goalId, setGoalId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("med");
  const [duration, setDuration] = useState<number>(0);
  const [repeat, setRepeat] = useState<"none" | RecurFreq>("none");
  const [weekdays, setWeekdays] = useState<number[]>([weekday]);

  const dayTasks = state.tasks.filter((t) => t.date === date);
  const freeLabels = freeSlotLabels(dayTasks);
  const suggestions =
    duration > 0 && !start ? suggestStarts(dayTasks, duration) : [];

  const applySuggestion = (hhmm: string) => {
    setStart(hhmm);
    setEnd(fmt(mins(hhmm) + duration));
  };

  const attachable = state.goals.filter(
    (g) =>
      !g.parentId &&
      ((g.scope === "week" && g.periodStart === weekStart) ||
        (g.scope === "month" && g.periodStart === monthStart) ||
        (g.scope === "year" && g.periodStart === yearStart))
  );

  const tasks = state.tasks
    .filter((t) => t.date === date)
    .sort((a, b) => {
      const pa = PRIORITY_WEIGHT[a.priority ?? "med"];
      const pb = PRIORITY_WEIGHT[b.priority ?? "med"];
      if (pa !== pb) return pb - pa;
      return (a.startTime ?? "99").localeCompare(b.startTime ?? "99");
    });
  const doneCount = tasks.filter((t) => t.done).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    // if a duration is set with a start but no end, derive the end
    const endTime =
      end || (start && duration > 0 ? fmt(mins(start) + duration) : undefined);
    if (repeat === "none") {
      addTask({
        title: t,
        date,
        startTime: start || undefined,
        endTime,
        goalId: goalId || undefined,
        priority,
        estimateMin: duration > 0 ? duration : undefined,
      });
    } else {
      addRecurrence({
        title: t,
        freq: repeat,
        weekdays: repeat === "weekly" ? weekdays : undefined,
        monthDay: repeat === "monthly" ? jd : undefined,
        startTime: start || undefined,
        endTime,
        goalId: goalId || undefined,
        priority,
      });
    }
    setTitle("");
    setStart("");
    setEnd("");
    setGoalId("");
    setPriority("med");
    setDuration(0);
    setRepeat("none");
  };

  const toggleWeekday = (d: number) =>
    setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]));

  return (
    <>
      <header className="day-nav">
        <div className="day-nav-titles">
          <h2>{relativeDayLabel(date)}</h2>
          <p className="sub">{formatJalaliFull(date)}</p>
        </div>
        <div className="day-nav-ctrls">
          <button
            className="icon-btn"
            onClick={() => setDate((d) => addDays(d, -1))}
            aria-label={t("today.prevDay")}
          >
            <Icon name="chevron" size={18} />
          </button>
          <button className="btn" onClick={() => setDate(todayISO())}>
            {t("common.today")}
          </button>
          <button
            className="icon-btn flip"
            onClick={() => setDate((d) => addDays(d, 1))}
            aria-label={t("today.nextDay")}
          >
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </header>

      <Alerts />

      <div className="day-planner">
        <section className="day-tasks">
          <div className="card tasks-card">
            <div className="widget-head">
              <h3>
                <Icon name="check" size={18} /> {t("today.tasks")}
              </h3>
              {tasks.length > 0 && (
                <span className="muted tnum">
                  {t("today.count", {
                    done: toFaDigits(doneCount),
                    total: toFaDigits(tasks.length),
                  })}
                </span>
              )}
            </div>

            {tasks.length > 0 && (
              <ProgressBar done={doneCount} total={tasks.length} showCount={false} />
            )}

            <form className="add-form" onSubmit={submit}>
              <div className="add-row add-main">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("today.addTask")}
                />
                <button
                  type="submit"
                  className="add-submit"
                  aria-label={t("common.add")}
                  title={t("common.add")}
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
              <div className="add-extras">
                <div className="field">
                  <span className="field-label">{t("today.timeRange")}</span>
                  <div className="time-inputs">
                    <input
                      type="time"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      aria-label={t("today.fromHour")}
                    />
                    <input
                      type="time"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      aria-label={t("today.toHour")}
                    />
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">{t("today.priority")}</span>
                  <div className="prio-select" role="group">
                    {(["low", "med", "high"] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={"prio-opt" + (priority === p ? " on" : "")}
                        onClick={() => setPriority(p)}
                      >
                        {t("prio." + p)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">{t("today.duration")}</span>
                  <select
                    className="goal-select"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    <option value={0}>{t("today.durNone")}</option>
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {toFaDigits(m)} {t("task.min")}
                      </option>
                    ))}
                  </select>
                </div>
                {attachable.length > 0 && (
                  <div className="field">
                    <span className="field-label">{t("today.goal")}</span>
                    <select
                      className="goal-select"
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
                  </div>
                )}
                <div className="field">
                  <span className="field-label">{t("today.repeat")}</span>
                  <select
                    className="goal-select"
                    value={repeat}
                    onChange={(e) =>
                      setRepeat(e.target.value as "none" | RecurFreq)
                    }
                  >
                    <option value="none">{t("today.noRepeat")}</option>
                    <option value="daily">{t("today.daily")}</option>
                    <option value="weekly">{t("today.weekly")}</option>
                    <option value="monthly">{t("today.monthly")}</option>
                  </select>
                </div>
              </div>
              {repeat === "weekly" && (
                <div className="weekday-row">
                  {weekdaysShort().map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      className={"wd" + (weekdays.includes(i) ? " on" : "")}
                      onClick={() => toggleWeekday(i)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="suggest-row">
                  <span className="field-label">{t("today.suggested")}</span>
                  <div className="suggest-chips">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="suggest-chip tnum"
                        onClick={() => applySuggestion(s)}
                      >
                        {toFaDigits(s)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="free-times subtle">
                {freeLabels.length > 0
                  ? `${t("today.freeTimes")}: ${freeLabels
                      .map((l) => toFaDigits(l))
                      .join(sep)}`
                  : t("today.noFree")}
              </p>
            </form>

            {tasks.length === 0 ? (
              <div className="empty">
                <Icon name="sparkle" size={22} />
                <span>{t("today.emptyDay")}</span>
              </div>
            ) : (
              <div className="list">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>

          <div className="widget-grid">
            <MoodPicker date={date} />
            <WaterTracker date={date} />
            <SleepTracker date={date} />
          </div>
          <GratitudeBox date={date} />
        </section>

        <aside className="day-timeline">
          <div className="card timeline-card">
            <div className="widget-head">
              <h3>
                <Icon name="clock" size={18} /> {t("today.hourly")}
              </h3>
            </div>
            <Timeline date={date} />
          </div>
        </aside>
      </div>

      {state.recurrences.length > 0 && (
        <section className="card">
          <div className="widget-head">
            <h3>
              <Icon name="repeat" size={16} /> {t("today.recurring")}
            </h3>
          </div>
          <div className="list">
            {state.recurrences.map((r) => (
              <div key={r.id} className="item">
                <span className="rec-badge">
                  <Icon name="repeat" size={14} />
                </span>
                <div className="item-main">
                  <span className="item-title">{r.title}</span>
                  <span className="item-metas">
                    <span className="item-meta">
                      {FREQ_LABEL[r.freq]}
                      {r.freq === "weekly" && r.weekdays
                        ? `: ${r.weekdays
                            .map((d) => weekdaysShort()[d])
                            .join(sep)}`
                        : ""}
                    </span>
                  </span>
                </div>
                <button
                  className="row-del"
                  onClick={() => removeRecurrence(r.id)}
                  aria-label={t("common.delete")}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
