import { Link } from "react-router-dom";
import { useStore } from "../domain/store";
import { Icon } from "../components/Icon";
import { ProgressBar } from "../components/ProgressBar";
import { MoodFace } from "../components/Mood";
import type { MoodLevel } from "../domain/types";
import { currentStreak, bestStreak } from "../lib/habits";
import { computePoints, levelInfo } from "../lib/gamification";
import { useI18n } from "../i18n";
import {
  parse,
  todayISO,
  toFaDigits,
  jalaliParts,
  jalaliMonthStartISO,
} from "../lib/date";
import { WATER_GOAL } from "../domain/types";

function lastDays(n: number): string[] {
  const today = parse(todayISO());
  return Array.from({ length: n }, (_, i) =>
    today.subtract(n - 1 - i, "day").format("YYYY-MM-DD")
  );
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Least-squares slope (minutes/day) over the recorded points. */
function slope(values: (number | null)[]): number | null {
  const pts = values
    .map((v, i) => (v == null ? null : ([i, v] as [number, number])))
    .filter((p): p is [number, number] => p !== null);
  if (pts.length < 2) return null;
  const n = pts.length;
  const sx = pts.reduce((s, [x]) => s + x, 0);
  const sy = pts.reduce((s, [, y]) => s + y, 0);
  const sxy = pts.reduce((s, [x, y]) => s + x * y, 0);
  const sxx = pts.reduce((s, [x]) => s + x * x, 0);
  const d = n * sxx - sx * sx;
  return d === 0 ? 0 : (n * sxy - sx * sy) / d;
}

/** Minimal line chart for the week's sleep (minutes; null = missing). */
function SleepChart({ values }: { values: (number | null)[] }) {
  const recorded = values.filter((v): v is number => v != null);
  if (recorded.length === 0) return null;
  const min = Math.min(...recorded);
  const max = Math.max(...recorded);
  const range = max - min || 1;
  const W = 100;
  const H = 40;
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => H - 4 - ((v - min) / range) * (H - 8);

  const pts = values
    .map((v, i) => (v == null ? null : `${x(i)},${y(v)}`))
    .filter((p): p is string => p !== null);

  return (
    <svg className="line-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <polyline className="line-path" points={pts.join(" ")} />
      {values.map((v, i) =>
        v == null ? null : (
          <circle key={i} className="line-dot" cx={x(i)} cy={y(v)} r={1.6} />
        )
      )}
    </svg>
  );
}

export default function Insights() {
  const { state, dailyLog } = useStore();
  const { t } = useI18n();
  const week = lastDays(7);
  const today = todayISO();
  const { jy, jm } = jalaliParts(today);

  // Tasks this week
  const weekTasks = state.tasks.filter((t) => week.includes(t.date));
  const weekDone = weekTasks.filter((t) => t.done).length;

  // Mood
  const moods = week.map((d) => dailyLog(d).mood);
  const rated = moods.filter((m): m is MoodLevel => !!m);
  const moodAvg =
    rated.length > 0
      ? Math.round((rated.reduce((s, m) => s + m, 0) / rated.length) * 10) / 10
      : null;

  // Water
  const waterTotal = week.reduce((s, d) => s + dailyLog(d).water, 0);
  const waterAvg = Math.round((waterTotal / 7) * 10) / 10;
  const waterHitDays = week.filter((d) => dailyLog(d).water >= WATER_GOAL).length;

  // Sleep (minutes per day; null = not logged)
  const sleepMins = week.map((d) => {
    const l = dailyLog(d);
    if (l.sleepStart && l.sleepEnd)
      return (toMin(l.sleepEnd) - toMin(l.sleepStart) + 1440) % 1440;
    return null;
  });
  const sleepSlope = slope(sleepMins);
  const sleepVerdict =
    sleepSlope === null
      ? "insights.sleepNone"
      : sleepSlope > 10
      ? "insights.sleepUp"
      : sleepSlope < -10
      ? "insights.sleepDown"
      : "insights.sleepFlat";

  // Habit streak leaderboard
  const leaderboard = [...state.habits]
    .map((h) => ({ h, streak: currentStreak(state.habitDays, h.id) }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  // Goals
  const yearStart = jalaliMonthStartISO(jy, 1);
  const monthStart = jalaliMonthStartISO(jy, jm);
  const yearGoals = state.goals.filter(
    (g) => g.scope === "year" && g.periodStart === yearStart
  );
  const monthGoals = state.goals.filter(
    (g) => g.scope === "month" && g.periodStart === monthStart
  );

  // ---- gamification (derived from the store) ----
  const points = computePoints(state);
  const lvl = levelInfo(points);
  const tasksDone = state.tasks.filter((tk) => tk.done).length;
  const goalsDone = state.goals.filter((g) => g.done).length;
  const gratCount = state.dailyLogs.reduce(
    (a, l) => a + (l.gratitude?.length ?? 0),
    0
  );
  const bestAnyStreak = state.habits.reduce(
    (m, h) => Math.max(m, bestStreak(state.habitDays, h.id)),
    0
  );
  const BADGES = [
    { key: "firstTask", icon: "leaf", earned: tasksDone >= 1 },
    { key: "tasks10", icon: "sparkle", earned: tasksDone >= 10 },
    { key: "tasks100", icon: "trophy", earned: tasksDone >= 100 },
    { key: "habit7", icon: "leaf", earned: bestAnyStreak >= 7 },
    { key: "habit30", icon: "flame", earned: bestAnyStreak >= 30 },
    { key: "goal1", icon: "target", earned: goalsDone >= 1 },
    { key: "grat10", icon: "sun", earned: gratCount >= 10 },
    { key: "level5", icon: "star", earned: lvl.level >= 5 },
  ] as const;
  const levelPct = Math.round((lvl.intoLevel / lvl.span) * 100);

  return (
    <>
      <header className="page-header insights-header">
        <div>
          <h2>
            <Icon name="chart" size={22} /> {t("insights.title")}
          </h2>
          <p className="sub">{t("insights.subtitle")}</p>
        </div>
        <Link to="/review" className="btn btn-primary review-cta">
          <Icon name="sparkle" size={16} /> {t("review.start")}
        </Link>
      </header>

      <section className="card game-card">
        <div className="game-top">
          <div className="game-level">
            <span className="game-lvl-num tnum">{toFaDigits(lvl.level)}</span>
            <span className="subtle">{t("game.level")}</span>
          </div>
          <span className="game-points tnum">
            {toFaDigits(points)} {t("game.points")}
          </span>
        </div>
        <span className="bar">
          <span className="bar-fill" style={{ width: `${levelPct}%` }} />
        </span>
        <p className="subtle game-tonext">
          {t("game.toNext", { n: toFaDigits(lvl.toNext) })}
        </p>
        <div className="badges">
          {BADGES.map((b) => (
            <div
              key={b.key}
              className={"badge" + (b.earned ? " earned" : "")}
              title={t("badge." + b.key)}
            >
              <Icon name={b.icon} size={20} />
              <span className="badge-label">{t("badge." + b.key)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="insight-grid">
        <div className="card insight">
          <div className="insight-head">
            <Icon name="check" size={16} /> {t("insights.weekTasks")}
          </div>
          <div className="insight-big tnum">
            {weekTasks.length === 0
              ? "—"
              : `${toFaDigits(
                  Math.round((weekDone / weekTasks.length) * 100)
                )}%`}
          </div>
          <ProgressBar done={weekDone} total={weekTasks.length} showCount />
        </div>

        <div className="card insight">
          <div className="insight-head">
            <Icon name="sparkle" size={16} /> {t("insights.moodAvg")}
          </div>
          {moodAvg === null ? (
            <p className="muted">{t("insights.notSet")}</p>
          ) : (
            <div className="insight-mood">
              <MoodFace level={Math.round(moodAvg) as MoodLevel} size={40} />
              <span>{t("mood." + (Math.round(moodAvg) as MoodLevel))}</span>
            </div>
          )}
          <div className="mini-trend">
            {moods.map((m, i) => (
              <div
                key={i}
                className={"mini-bar" + (m ? "" : " none")}
                style={{ height: `${m ? m * 18 : 4}%` }}
              />
            ))}
          </div>
        </div>

        <div className="card insight">
          <div className="insight-head">
            <Icon name="droplet" size={16} /> {t("insights.waterAvg")}
          </div>
          <div className="insight-big tnum">{toFaDigits(waterAvg)}</div>
          <p className="muted">
            {t("insights.waterHit", { n: toFaDigits(waterHitDays) })}
          </p>
        </div>
      </div>

      <section className="card chart-card">
        <div className="widget-head">
          <h3>
            <Icon name="sparkle" size={16} /> {t("insights.moodTrend")}
          </h3>
        </div>
        {rated.length === 0 ? (
          <p className="muted">{t("insights.notSet")}</p>
        ) : (
          <div className="mood-trend">
            {week.map((d, i) => {
              const m = moods[i];
              return (
                <div key={d} className="trend-col">
                  <div className={"trend-face" + (m ? "" : " none")}>
                    {m ? <MoodFace level={m} size={26} /> : <span>—</span>}
                  </div>
                  <span className="grid-day tnum">
                    {toFaDigits(jalaliParts(d).jd)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="widget-head">
          <h3>
            <Icon name="moon" size={16} /> {t("insights.sleepTrend")}
          </h3>
          <span className="muted">{t(sleepVerdict)}</span>
        </div>
        <SleepChart values={sleepMins} />
        <div className="chart-days">
          {week.map((d) => (
            <span key={d} className="grid-day tnum">
              {toFaDigits(jalaliParts(d).jd)}
            </span>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="widget-head">
          <h3>
            <Icon name="flame" size={16} /> {t("insights.habitRecords")}
          </h3>
        </div>
        {leaderboard.length === 0 ? (
          <p className="muted">{t("insights.noHabits")}</p>
        ) : (
          <div className="lead-list">
            {leaderboard.map(({ h, streak }) => (
              <div key={h.id} className="lead-row">
                <span className={"habit-badge" + (h.kind === "quit" ? " quit" : "")}>
                  <Icon name={h.kind === "quit" ? "ban" : "leaf"} size={14} />
                </span>
                <span className="lead-name">{h.title}</span>
                <span className="lead-streak tnum">
                  <Icon name="flame" size={15} />
                  {toFaDigits(streak)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="widget-head">
          <h3>
            <Icon name="target" size={16} /> {t("insights.goals")}
          </h3>
        </div>
        <div className="goals-progress-stack">
          <ProgressBar
            done={yearGoals.filter((g) => g.done).length}
            total={yearGoals.length}
            label={t("goals.year", { y: toFaDigits(jy) })}
          />
          <ProgressBar
            done={monthGoals.filter((g) => g.done).length}
            total={monthGoals.length}
            label={t("goals.progressMonth")}
          />
        </div>
      </section>
    </>
  );
}
