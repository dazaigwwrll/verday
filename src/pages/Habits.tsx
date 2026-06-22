import { useState } from "react";
import { useStore } from "../domain/store";
import { Icon } from "../components/Icon";
import type { Habit, HabitKind } from "../domain/types";
import { currentStreak, bestStreak, totalDays } from "../lib/habits";
import {
  todayISO,
  toFaDigits,
  jalaliParts,
  weekStartISO,
  addDays,
  formatJalaliLong,
  months,
  weekdaysShort,
} from "../lib/date";
import { useI18n } from "../i18n";
import { useConfirm } from "../components/Confirm";

const WEEKS = 13;

/** Chronological days from the Saturday of the earliest week through
 *  today, so they tile a 7-row, week-per-column heatmap. */
function heatmapDays(): string[] {
  const today = todayISO();
  let d = addDays(weekStartISO(today), -(WEEKS - 1) * 7);
  const out: string[] = [];
  while (d <= today) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

function HabitRow({ habit, days }: { habit: Habit; days: string[] }) {
  const { state, toggleHabitDay, removeHabit } = useStore();
  const { t } = useI18n();
  const confirm = useConfirm();
  const streak = currentStreak(state.habitDays, habit.id);
  const best = bestStreak(state.habitDays, habit.id);
  const total = totalDays(state.habitDays, habit.id);
  const quit = habit.kind === "quit";

  // heatmap axis labels: weekday rows + month markers on the columns
  const wd = weekdaysShort();
  const weeks = Math.ceil(days.length / 7);
  const monthLabels = Array.from({ length: weeks }, (_, c) => {
    const m = jalaliParts(days[c * 7]).jm;
    const prev = c > 0 ? jalaliParts(days[(c - 1) * 7]).jm : -1;
    return m !== prev ? months()[m - 1] : "";
  });
  const todayWd = jalaliParts(todayISO()).weekday;

  return (
    <div className={"habit-card card" + (quit ? " quit" : "")}>
      <div className="habit-card-head">
        <div className="habit-title">
          <span className={"habit-badge" + (quit ? " quit" : "")}>
            <Icon name={quit ? "ban" : "leaf"} size={15} />
          </span>
          <span>{habit.title}</span>
        </div>
        <button
          className="row-del"
          onClick={async () => {
            if (await confirm(t("confirm.deleteHabit"))) removeHabit(habit.id);
          }}
          aria-label={t("common.delete")}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      <div className="streak-stats">
        <div className="stat-chip">
          <Icon name="flame" size={16} />
          <span className="tnum">{toFaDigits(streak)}</span>
          <span className="subtle">
            {quit ? t("habits.streakClean") : t("habits.streakDays")}
          </span>
        </div>
        <div className="stat-chip">
          <Icon name="trophy" size={16} />
          <span className="tnum">{toFaDigits(best)}</span>
          <span className="subtle">{t("habits.best")}</span>
        </div>
        <div className="stat-chip">
          <Icon name="check" size={16} />
          <span className="tnum">{toFaDigits(total)}</span>
          <span className="subtle">{t("habits.total")}</span>
        </div>
      </div>

      <div className="hm-wrap">
        <div className="hm-months-row">
          <span className="hm-side-spacer" />
          <div
            className="hm-months"
            style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
          >
            {monthLabels.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
        <div className="hm-cells-row">
          <div className="hm-weekdays">
            {wd.map((l, i) => (
              <span key={i} className={i === todayWd ? "on" : ""}>
                {l}
              </span>
            ))}
          </div>
          <div className="habit-heatmap">
            {days.map((d) => {
              const on = (state.habitDays[d] ?? []).includes(habit.id);
              const isToday = d === todayISO();
              return (
                <button
                  key={d}
                  className={
                    "hm-cell" +
                    (on ? (quit ? " on quit" : " on") : "") +
                    (isToday ? " today" : "")
                  }
                  onClick={() => isToday && toggleHabitDay(d, habit.id)}
                  disabled={!isToday}
                  title={
                    formatJalaliLong(d) +
                    (isToday ? ` — ${t("habits.todayMark")}` : ` — ${t("habits.todayOnly")}`)
                  }
                  aria-label={formatJalaliLong(d)}
                />
              );
            })}
          </div>
        </div>
      </div>
      <p className="habit-heatmap-cap subtle">
        {t("habits.lastWeeks", { n: toFaDigits(WEEKS) })} · {t("habits.todayMark")}:{" "}
        {formatJalaliLong(todayISO())}
      </p>
    </div>
  );
}

export default function Habits() {
  const { state, addHabit } = useStore();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<HabitKind>("build");
  const days = heatmapDays();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addHabit(title, kind);
    setTitle("");
  };

  const build = state.habits.filter((h) => h.kind === "build");
  const quit = state.habits.filter((h) => h.kind === "quit");

  return (
    <>
      <header className="page-header">
        <h2>
          <Icon name="habit" size={22} /> {t("habits.title")}
        </h2>
        <p className="sub">{t("habits.subtitle")}</p>
      </header>

      <section className="card">
        <div className="kind-switch">
          <button
            className={"kind-opt" + (kind === "build" ? " on" : "")}
            onClick={() => setKind("build")}
            type="button"
          >
            <Icon name="leaf" size={16} /> {t("habits.build")}
          </button>
          <button
            className={"kind-opt" + (kind === "quit" ? " on quit" : "")}
            onClick={() => setKind("quit")}
            type="button"
          >
            <Icon name="ban" size={16} /> {t("habits.quit")}
          </button>
        </div>
        <form className="add-row" onSubmit={submit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "build" ? t("habits.buildPh") : t("habits.quitPh")}
          />
          <button type="submit" className="btn btn-primary">
            <Icon name="plus" size={18} />
            {t("common.add")}
          </button>
        </form>
      </section>

      {state.habits.length === 0 && (
        <div className="empty">
          <Icon name="sparkle" size={22} />
          <span>{t("habits.empty")}</span>
        </div>
      )}

      {build.length > 0 && (
        <section className="habit-group">
          <h3 className="group-title">
            <Icon name="leaf" size={16} /> {t("habits.building")}
          </h3>
          {build.map((h) => (
            <HabitRow key={h.id} habit={h} days={days} />
          ))}
        </section>
      )}

      {quit.length > 0 && (
        <section className="habit-group">
          <h3 className="group-title">
            <Icon name="ban" size={16} /> {t("habits.quitting")}
          </h3>
          {quit.map((h) => (
            <HabitRow key={h.id} habit={h} days={days} />
          ))}
        </section>
      )}

    </>
  );
}
