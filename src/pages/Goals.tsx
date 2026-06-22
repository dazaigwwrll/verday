import { useState } from "react";
import { GoalSection } from "../components/GoalSection";
import { Icon } from "../components/Icon";
import { useStore } from "../domain/store";
import {
  jalaliParts,
  jalaliMonthStartISO,
  jalaliAddMonths,
  formatJalaliMonth,
  formatWeekRange,
  weekStartISO,
  addDays,
  todayISO,
  toFaDigits,
} from "../lib/date";
import { useI18n } from "../i18n";

type Tab = "year" | "month" | "week";

const TABS: { key: Tab; icon: "flag" | "month" | "week" }[] = [
  { key: "year", icon: "flag" },
  { key: "month", icon: "month" },
  { key: "week", icon: "week" },
];

export default function Goals() {
  const [tab, setTab] = useState<Tab>("month");
  const [offset, setOffset] = useState(0);
  const { state } = useStore();
  const { t } = useI18n();

  const today = todayISO();
  const { jy, jm } = jalaliParts(today);

  // Resolve the active period start + a human label from tab + offset.
  let periodStart: string;
  let periodLabel: string;
  let placeholder: string;
  let progressLabel: string;
  if (tab === "year") {
    periodStart = jalaliMonthStartISO(jy + offset, 1);
    periodLabel = t("goals.year", { y: toFaDigits(jy + offset) });
    placeholder = t("goals.addYear");
    progressLabel = t("goals.progressYear");
  } else if (tab === "month") {
    const m = jalaliAddMonths(jy, jm, offset);
    periodStart = jalaliMonthStartISO(m.jy, m.jm);
    periodLabel = formatJalaliMonth(m.jy, m.jm);
    placeholder = t("goals.addMonth");
    progressLabel = t("goals.progressMonth");
  } else {
    periodStart = weekStartISO(addDays(today, offset * 7));
    periodLabel = formatWeekRange(periodStart);
    placeholder = t("goals.addWeek");
    progressLabel = t("goals.progressWeek");
  }

  const list = state.goals.filter(
    (g) => g.scope === tab && g.periodStart === periodStart && !g.parentId
  );
  const done = list.filter((g) => g.done).length;
  const total = list.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const switchTab = (k: Tab) => {
    setTab(k);
    setOffset(0);
  };

  return (
    <>
      <header className="page-header">
        <h2>
          <Icon name="target" size={22} /> {t("goals.title")}
        </h2>
        <p className="sub">{t("goals.subtitle")}</p>
      </header>

      <div className="tabs">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            className={"tab" + (tab === tb.key ? " on" : "")}
            onClick={() => switchTab(tb.key)}
          >
            <Icon name={tb.icon} size={16} /> {t("goals." + tb.key + "ly")}
          </button>
        ))}
      </div>

      <div className="goals-board">
        <div className="period-nav">
          <button
            className="period-arrow"
            onClick={() => setOffset((o) => o - 1)}
            aria-label={t("goals.prev")}
            title={t("goals.prev")}
          >
            <Icon name="chevron" size={18} className="arrow-prev" />
          </button>
          <div className="period-center">
            <span className="period-label">{periodLabel}</span>
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
            title={t("goals.next")}
          >
            <Icon name="chevron" size={18} className="arrow-next" />
          </button>
        </div>

        {total > 0 && (
          <div className="goal-hero">
            <div className="goal-hero-top">
              <span className="goal-hero-label">{progressLabel}</span>
              <span className="goal-hero-pct">{pct}%</span>
            </div>
            <span className="bar">
              <span
                className={"bar-fill" + (pct === 100 ? " success" : "")}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="goal-hero-sub">
              {t("goals.doneOf", { done: toFaDigits(done), total: toFaDigits(total) })}
            </span>
          </div>
        )}

        <GoalSection scope={tab} periodStart={periodStart} placeholder={placeholder} />
      </div>
    </>
  );
}
