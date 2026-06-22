/* ============================================================
   Guided weekly review — a short, step-by-step end-of-week flow:
   1) how the week went, 2) clear unfinished tasks, 3) reflect +
   gratitude, 4) get ready for next week. Reads the local store;
   the reflection note is saved per week.
   ============================================================ */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../domain/store";
import { Icon } from "../components/Icon";
import { MoodFace } from "../components/Mood";
import { useI18n } from "../i18n";
import {
  weekStartISO,
  addDays,
  todayISO,
  formatWeekRange,
  relativeDayLabel,
  toFaDigits,
} from "../lib/date";
import { WATER_GOAL, type MoodLevel } from "../domain/types";

function sleepMins(start: string, end: string): number {
  const m = (s: string) => {
    const [h, mm] = s.split(":").map(Number);
    return h * 60 + (mm || 0);
  };
  return (m(end) - m(start) + 1440) % 1440;
}

const STEPS = ["overview", "unfinished", "reflect", "next"] as const;

export default function Review() {
  const { state, setReview, rescheduleOverdue } = useStore();
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const today = todayISO();
  const weekStart = weekStartISO(today);
  const weekEnd = addDays(weekStart, 6);
  const inRange = (d: string) => d >= weekStart && d <= weekEnd;

  const [reflection, setReflection] = useState(state.reviews[weekStart] ?? "");

  const weekTasks = state.tasks.filter((tk) => inRange(tk.date));
  const doneTasks = weekTasks.filter((tk) => tk.done).length;
  const pct = weekTasks.length
    ? Math.round((doneTasks / weekTasks.length) * 100)
    : 0;

  const logs = state.dailyLogs.filter((l) => inRange(l.date));
  const moods = logs.filter((l) => l.mood).map((l) => l.mood as MoodLevel);
  const moodAvg = moods.length
    ? moods.reduce((a, b) => a + b, 0) / moods.length
    : null;
  const sleeps = logs
    .filter((l) => l.sleepStart && l.sleepEnd)
    .map((l) => sleepMins(l.sleepStart!, l.sleepEnd!));
  const sleepAvg = sleeps.length
    ? Math.round(sleeps.reduce((a, b) => a + b, 0) / sleeps.length)
    : null;
  const waterAvg = Math.round(
    (logs.reduce((a, l) => a + l.water, 0) / 7) * 10
  ) / 10;

  const habitDone = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    .reduce((sum, d) => sum + (state.habitDays[d]?.length ?? 0), 0);
  const habitPossible = state.habits.length * 7;
  const habitPct = habitPossible
    ? Math.round((habitDone / habitPossible) * 100)
    : null;

  const weekGoals = state.goals.filter(
    (g) => g.scope === "week" && g.periodStart === weekStart && !g.parentId
  );
  const weekGoalsDone = weekGoals.filter((g) => g.done).length;

  const unfinished = weekTasks
    .filter((tk) => !tk.done && tk.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const gratitude = logs.flatMap((l) => l.gratitude);

  const saveReflection = () => {
    if (reflection !== (state.reviews[weekStart] ?? ""))
      setReview(weekStart, reflection);
  };

  const cur = STEPS[step];

  return (
    <>
      <header className="page-header">
        <h2>
          <Icon name="sparkle" size={22} /> {t("review.title")}
        </h2>
        <p className="sub">
          {formatWeekRange(weekStart)} · {t("review.subtitle")}
        </p>
      </header>

      <div className="review-steps">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={
              "review-dot" + (i === step ? " on" : "") + (i < step ? " past" : "")
            }
          />
        ))}
      </div>

      <section className="card review-card">
        {cur === "overview" && (
          <>
            <h3 className="review-step-title">{t("review.overview")}</h3>
            <div className="review-grid">
              <div className="review-stat">
                <span className="review-stat-num tnum">{pct}%</span>
                <span className="review-stat-label">
                  {t("review.tasksDone", {
                    done: toFaDigits(doneTasks),
                    total: toFaDigits(weekTasks.length),
                  })}
                </span>
              </div>
              <div className="review-stat">
                <span className="review-stat-num">
                  {moodAvg !== null ? (
                    <MoodFace level={Math.round(moodAvg) as MoodLevel} size={30} />
                  ) : (
                    "—"
                  )}
                </span>
                <span className="review-stat-label">{t("review.mood")}</span>
              </div>
              <div className="review-stat">
                <span className="review-stat-num tnum">
                  {sleepAvg !== null
                    ? t("sleep.dur", {
                        h: toFaDigits(Math.floor(sleepAvg / 60)),
                        m: toFaDigits(sleepAvg % 60),
                      })
                    : "—"}
                </span>
                <span className="review-stat-label">{t("review.sleep")}</span>
              </div>
              <div className="review-stat">
                <span className="review-stat-num tnum">
                  {toFaDigits(waterAvg)}/{toFaDigits(WATER_GOAL)}
                </span>
                <span className="review-stat-label">{t("review.water")}</span>
              </div>
              {habitPct !== null && (
                <div className="review-stat">
                  <span className="review-stat-num tnum">{habitPct}%</span>
                  <span className="review-stat-label">{t("review.habits")}</span>
                </div>
              )}
              {weekGoals.length > 0 && (
                <div className="review-stat">
                  <span className="review-stat-num tnum">
                    {toFaDigits(weekGoalsDone)}/{toFaDigits(weekGoals.length)}
                  </span>
                  <span className="review-stat-label">{t("review.goals")}</span>
                </div>
              )}
            </div>
          </>
        )}

        {cur === "unfinished" && (
          <>
            <h3 className="review-step-title">{t("review.unfinished")}</h3>
            {unfinished.length === 0 ? (
              <div className="empty">
                <Icon name="check" size={22} />
                <span>{t("review.unfinishedNone")}</span>
              </div>
            ) : (
              <>
                <div className="list">
                  {unfinished.map((tk) => (
                    <div key={tk.id} className="item">
                      <div className="item-main">
                        <span className="item-title">{tk.title}</span>
                        <span className="item-meta">{relativeDayLabel(tk.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary review-moveall"
                  onClick={() => rescheduleOverdue(today)}
                >
                  <Icon name="postpone" size={16} />{" "}
                  {t("review.moveAll", { n: toFaDigits(unfinished.length) })}
                </button>
              </>
            )}
          </>
        )}

        {cur === "reflect" && (
          <>
            <h3 className="review-step-title">{t("review.reflect")}</h3>
            {gratitude.length > 0 && (
              <ul className="review-grat">
                {gratitude.map((g, i) => (
                  <li key={i}>
                    <Icon name="heart" size={13} className="g-bullet" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              className="review-reflection"
              rows={4}
              value={reflection}
              placeholder={t("review.reflectionPh")}
              onChange={(e) => setReflection(e.target.value)}
              onBlur={saveReflection}
            />
          </>
        )}

        {cur === "next" && (
          <div className="review-next">
            <Icon name="sparkle" size={28} />
            <h3 className="review-step-title">{t("review.nextWeek")}</h3>
            <p className="muted">{t("review.nextWeekText")}</p>
            <Link to="/week" className="btn btn-primary" onClick={saveReflection}>
              <Icon name="week" size={16} /> {t("review.goWeek")}
            </Link>
          </div>
        )}
      </section>

      <div className="review-nav">
        <button
          className="btn"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <Icon name="chevron" size={16} className="arrow-prev" /> {t("review.back")}
        </button>
        <span className="review-count subtle">
          {t("review.step", {
            n: toFaDigits(step + 1),
            total: toFaDigits(STEPS.length),
          })}
        </span>
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
            {t("review.next")} <Icon name="chevron" size={16} className="arrow-next" />
          </button>
        ) : (
          <Link to="/" className="btn btn-primary" onClick={saveReflection}>
            <Icon name="check" size={16} /> {t("review.finish")}
          </Link>
        )}
      </div>
    </>
  );
}
