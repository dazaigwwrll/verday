/* ============================================================
   Day timeline — time-blocking view. Timed tasks are placed on
   an hourly grid; a "now" line shows on today.
   ============================================================ */

import { useEffect, useState } from "react";
import { useStore } from "../domain/store";
import type { Task } from "../domain/types";
import { dayjs, todayISO, toFaDigits } from "../lib/date";
import { useI18n } from "../i18n";

const START_HOUR = 6;
const END_HOUR = 24;
const PX_PER_HOUR = 54;

function mins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function Timeline({ date }: { date: string }) {
  const { state, toggleTask } = useStore();
  const { t } = useI18n();
  const [nowMin, setNowMin] = useState(() => {
    const d = dayjs();
    return d.hour() * 60 + d.minute();
  });

  const isToday = date === todayISO();

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => {
      const d = dayjs();
      setNowMin(d.hour() * 60 + d.minute());
    }, 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => START_HOUR + i
  );
  const totalMin = (END_HOUR - START_HOUR) * 60;
  const yOf = (m: number) => ((m - START_HOUR * 60) / 60) * PX_PER_HOUR;

  const timed = state.tasks
    .filter((t) => t.date === date && t.startTime)
    .sort((a, b) => mins(a.startTime!) - mins(b.startTime!));

  const place = (t: Task) => {
    const s = Math.max(START_HOUR * 60, mins(t.startTime!));
    const e = t.endTime ? Math.max(s + 20, mins(t.endTime)) : s + 40;
    return { top: yOf(s), height: ((e - s) / 60) * PX_PER_HOUR };
  };

  const nowVisible =
    isToday && nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60;

  return (
    <div className="timeline" style={{ height: (totalMin / 60) * PX_PER_HOUR }}>
      {hours.map((h) => (
        <div
          key={h}
          className="tl-hour"
          style={{ top: yOf(h * 60) }}
        >
          <span className="tl-label tnum">{toFaDigits(h)}</span>
          <span className="tl-line" />
        </div>
      ))}

      {timed.map((t) => {
        const { top, height } = place(t);
        return (
          <button
            key={t.id}
            className={"tl-block" + (t.done ? " done" : "")}
            style={{ top, height }}
            onClick={() => toggleTask(t.id)}
            title={t.title}
          >
            <span className="tl-block-title">{t.title}</span>
            <span className="tl-block-time tnum">
              {toFaDigits(t.startTime!)}
              {t.endTime ? `–${toFaDigits(t.endTime)}` : ""}
            </span>
          </button>
        );
      })}

      {nowVisible && (
        <div className="tl-now" style={{ top: yOf(nowMin) }}>
          <span className="tl-now-dot" />
        </div>
      )}

      {timed.length === 0 && (
        <div className="tl-empty subtle">{t("tl.empty")}</div>
      )}
    </div>
  );
}
