/* ============================================================
   Focus page — a Pomodoro timer with a circular countdown. The
   timer itself lives in the global FocusProvider, so it keeps
   running across pages and survives reloads. You can optionally
   focus on one of today's tasks.
   ============================================================ */

import { Icon } from "../components/Icon";
import { useFocus } from "../focus";
import { useStore } from "../domain/store";
import { useI18n } from "../i18n";
import { todayISO, toFaDigits } from "../lib/date";

const WORK_PRESETS = [25, 50];
const BREAK_PRESETS = [5, 10, 15];

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${toFaDigits(pad(m))}:${toFaDigits(pad(s))}`;
}

export default function Focus() {
  const {
    phase,
    running,
    remainingMs,
    totalMs,
    workMin,
    breakMin,
    completed,
    taskId,
    start,
    pause,
    reset,
    skip,
    setWorkMin,
    setBreakMin,
    setTask,
  } = useFocus();
  const { state } = useStore();
  const { t } = useI18n();

  const todayTasks = state.tasks.filter((x) => x.date === todayISO() && !x.done);
  const focusTask = taskId ? state.tasks.find((x) => x.id === taskId) : undefined;

  const isBreak = phase === "break";
  const frac = totalMs > 0 ? 1 - remainingMs / totalMs : 0;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <>
      <header className="page-header">
        <h2>
          <Icon name="clock" size={22} /> {t("focus.title")}
        </h2>
        <p className="sub">{t("focus.subtitle")}</p>
      </header>

      <section className={"card focus-card" + (isBreak ? " break" : "")}>
        <span className="focus-phase">
          {phase === "break" ? t("focus.break") : t("focus.work")}
        </span>

        <div className="focus-ring">
          <svg viewBox="0 0 120 120">
            <circle className="focus-ring-bg" cx="60" cy="60" r={R} />
            <circle
              className="focus-ring-fg"
              cx="60"
              cy="60"
              r={R}
              style={{
                strokeDasharray: C,
                strokeDashoffset: C * (1 - frac),
              }}
            />
          </svg>
          <div className="focus-time tnum">{clock(remainingMs)}</div>
        </div>

        <div className="focus-controls">
          <button className="icon-btn" onClick={reset} aria-label={t("focus.reset")} title={t("focus.reset")}>
            <Icon name="repeat" size={18} />
          </button>
          <button className="focus-main btn btn-primary" onClick={running ? pause : start}>
            <Icon name={running ? "stop" : "play"} size={18} />
            {running ? t("focus.pause") : t("focus.start")}
          </button>
          <button className="icon-btn" onClick={skip} aria-label={t("focus.skip")} title={t("focus.skip")}>
            <Icon name="postpone" size={18} />
          </button>
        </div>

        <p className="focus-done subtle">
          <Icon name="check" size={14} /> {t("focus.completed", { n: toFaDigits(completed) })}
        </p>
      </section>

      <section className="card focus-settings">
        <div className="focus-field">
          <span className="field-label">{t("focus.workLen")}</span>
          <div className="seg">
            {WORK_PRESETS.map((m) => (
              <button
                key={m}
                className={"seg-opt" + (workMin === m ? " on" : "")}
                onClick={() => setWorkMin(m)}
                disabled={running}
              >
                {toFaDigits(m)} {t("task.min")}
              </button>
            ))}
          </div>
        </div>
        <div className="focus-field">
          <span className="field-label">{t("focus.breakLen")}</span>
          <div className="seg">
            {BREAK_PRESETS.map((m) => (
              <button
                key={m}
                className={"seg-opt" + (breakMin === m ? " on" : "")}
                onClick={() => setBreakMin(m)}
                disabled={running}
              >
                {toFaDigits(m)} {t("task.min")}
              </button>
            ))}
          </div>
        </div>

        <div className="focus-field">
          <span className="field-label">{t("focus.focusOn")}</span>
          {focusTask ? (
            <div className="focus-task">
              <Icon name="target-sm" size={14} />
              <span>{focusTask.title}</span>
              <button className="row-del" onClick={() => setTask(undefined)} aria-label={t("common.delete")}>
                <Icon name="plus" size={14} className="rot45" />
              </button>
            </div>
          ) : todayTasks.length > 0 ? (
            <select
              className="goal-select"
              value=""
              onChange={(e) => e.target.value && setTask(e.target.value)}
            >
              <option value="">{t("focus.pickTask")}</option>
              {todayTasks.map((tk) => (
                <option key={tk.id} value={tk.id}>
                  {tk.title}
                </option>
              ))}
            </select>
          ) : (
            <span className="subtle">{t("focus.noTasks")}</span>
          )}
        </div>
      </section>
    </>
  );
}
