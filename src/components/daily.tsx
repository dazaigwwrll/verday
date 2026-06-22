/* ============================================================
   Daily widgets: mood picker, water tracker, gratitude box.
   Minimal, with small "cute" animations (see App.css).
   ============================================================ */

import { useMemo, useState } from "react";
import { useStore } from "../domain/store";
import { WATER_GOAL } from "../domain/types";
import { Icon } from "./Icon";
import { MoodFace, MOOD_LEVELS } from "./Mood";
import { toFaDigits } from "../lib/date";
import { useI18n } from "../i18n";

export function MoodPicker({ date }: { date: string }) {
  const { dailyLog, setMood } = useStore();
  const { t, lang, moodMsgs } = useI18n();
  const current = dailyLog(date).mood;

  // pick a random empathetic line; stable until mood/date/lang changes
  const message = useMemo(() => {
    if (!current) return "";
    const arr = moodMsgs(current);
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, date, lang]);

  return (
    <section className="card widget">
      <div className="widget-head">
        <h3>{t("mood.title")}</h3>
      </div>
      <div className="mood-row">
        {MOOD_LEVELS.map((lvl) => (
          <button
            key={lvl}
            className={"mood-btn" + (current === lvl ? " on" : "")}
            onClick={() => setMood(date, lvl)}
            aria-label={t("mood." + lvl)}
            title={t("mood." + lvl)}
          >
            <MoodFace level={lvl} size={34} />
          </button>
        ))}
      </div>
      {current && message && (
        <p className="mood-msg subtle" key={current}>
          <MoodFace level={current} size={18} />
          <span>{message}</span>
        </p>
      )}
    </section>
  );
}

export function WaterTracker({ date }: { date: string }) {
  const { dailyLog, setWater } = useStore();
  const { t } = useI18n();
  const count = dailyLog(date).water;
  const slots = Math.max(WATER_GOAL, count);
  const reached = count >= WATER_GOAL;

  return (
    <section className="card widget water-widget">
      <div className="widget-head">
        <h3>{t("water.title")}</h3>
        <span className="muted tnum">
          {t("water.count", { n: toFaDigits(count), goal: toFaDigits(WATER_GOAL) })}
        </span>
      </div>
      <div className="glass-row">
        {Array.from({ length: slots }, (_, i) => (
          <button
            key={i}
            className={"glass-btn" + (i < count ? " full" : "")}
            onClick={() => setWater(date, i + 1 === count ? i : i + 1)}
            aria-label={`${t("water.title")} ${toFaDigits(i + 1)}`}
          >
            <Icon name="glass" size={24} />
          </button>
        ))}
        <button
          className="icon-btn glass-add"
          onClick={() => setWater(date, count + 1)}
          aria-label={t("common.add")}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      {reached && <p className="water-done">{t("water.done")}</p>}
    </section>
  );
}

function sleepMinutes(start: string, end: string): number {
  const m = (s: string) => {
    const [h, mm] = s.split(":").map(Number);
    return h * 60 + (mm || 0);
  };
  return (m(end) - m(start) + 1440) % 1440;
}

export function SleepTracker({ date }: { date: string }) {
  const { dailyLog, setSleep } = useStore();
  const { t, lang, sleepMsgs } = useI18n();
  const log = dailyLog(date);
  const start = log.sleepStart ?? "";
  const end = log.sleepEnd ?? "";

  const total = start && end ? sleepMinutes(start, end) : null;
  const category =
    total === null ? null : total < 360 ? "under" : total > 540 ? "over" : "enough";

  const message = useMemo(() => {
    if (!category) return "";
    const arr = sleepMsgs(category);
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, date, lang]);

  return (
    <section className="card widget sleep-widget">
      <div className="widget-head">
        <h3>{t("sleep.title")}</h3>
        {total !== null && (
          <span className={"sleep-dur tnum " + (category ?? "")}>
            <Icon name="clock" size={12} />
            {t("sleep.dur", {
              h: toFaDigits(Math.floor(total / 60)),
              m: toFaDigits(total % 60),
            })}
          </span>
        )}
      </div>
      <div className="sleep-row">
        <label className="sleep-field">
          <span className="sleep-field-label">
            <Icon name="moon" size={14} /> {t("sleep.bed")}
          </span>
          <input
            type="time"
            value={start}
            onChange={(e) => setSleep(date, e.target.value || undefined, end || undefined)}
          />
        </label>
        <Icon name="chevron" size={16} className="sleep-arrow arrow-next" />
        <label className="sleep-field">
          <span className="sleep-field-label">
            <Icon name="sun" size={14} /> {t("sleep.wake")}
          </span>
          <input
            type="time"
            value={end}
            onChange={(e) => setSleep(date, start || undefined, e.target.value || undefined)}
          />
        </label>
      </div>
      {message && (
        <p className={"mood-msg subtle sleep-msg " + category} key={message}>
          {message}
        </p>
      )}
    </section>
  );
}

export function GratitudeBox({
  date,
}: {
  date: string;
}) {
  const { dailyLog, addGratitude, removeGratitude } = useStore();
  const { t } = useI18n();
  const items = dailyLog(date).gratitude;
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addGratitude(date, text);
    setText("");
  };

  return (
    <section className="card widget">
      <div className="widget-head">
        <h3>
          <Icon name="heart" size={16} /> {t("grat.title")}
        </h3>
      </div>
      <form className="add-row" onSubmit={submit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("grat.ph")}
        />
        <button type="submit" className="btn btn-primary">
          <Icon name="plus" size={18} />
          {t("common.add")}
        </button>
      </form>
      {items.length > 0 && (
        <ul className="gratitude-list">
          {items.map((g, i) => (
            <li key={i} className="gratitude-item">
              <Icon name="heart" size={14} className="g-bullet" />
              <span>{g}</span>
              <button
                className="row-del"
                onClick={() => removeGratitude(date, i)}
                aria-label={t("common.delete")}
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
