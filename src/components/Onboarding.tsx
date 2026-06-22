/* ============================================================
   First-run welcome. Shows once, only when the app is empty, to
   introduce the planner. Offers to load a small sample so the
   user sees how things connect, or to start from scratch.
   ============================================================ */

import { useState } from "react";
import { useStore } from "../domain/store";
import { useI18n } from "../i18n";
import { Icon } from "./Icon";
import { todayISO, addDays, jalaliParts, jalaliMonthStartISO } from "../lib/date";

const KEY = "planner.onboarded.v1";

const BULLETS = [
  { icon: "home" as const, key: "onb.b1" },
  { icon: "target" as const, key: "onb.b2" },
  { icon: "habit" as const, key: "onb.b3" },
  { icon: "clock" as const, key: "onb.b4" },
];

export function Onboarding() {
  const { state, addGoal, addTask, addHabit } = useStore();
  const { t } = useI18n();
  const empty =
    state.tasks.length === 0 &&
    state.goals.length === 0 &&
    state.habits.length === 0;
  const [show, setShow] = useState(
    () => empty && localStorage.getItem(KEY) !== "1"
  );

  if (!show) return null;

  const finish = () => {
    localStorage.setItem(KEY, "1");
    setShow(false);
  };

  const loadSample = () => {
    const { jy, jm } = jalaliParts(todayISO());
    const yg = addGoal({
      title: t("onb.sGoalYear"),
      scope: "year",
      periodStart: jalaliMonthStartISO(jy, 1),
    });
    const mg = addGoal({
      title: t("onb.sGoalMonth"),
      scope: "month",
      periodStart: jalaliMonthStartISO(jy, jm),
    });
    addTask({
      title: t("onb.sTask1"),
      date: todayISO(),
      startTime: "09:00",
      endTime: "09:30",
      priority: "high",
      estimateMin: 30,
      goalId: mg.id,
    });
    addTask({
      title: t("onb.sTask2"),
      date: todayISO(),
      priority: "med",
      goalId: yg.id,
    });
    addTask({
      title: t("onb.sTask3"),
      date: addDays(todayISO(), 1),
      priority: "low",
    });
    addHabit(t("onb.sHabit"), "build");
    finish();
  };

  return (
    <div className="onb-overlay">
      <div className="onb-box card">
        <span className="onb-mark">
          <Icon name="leaf" size={26} />
        </span>
        <h2 className="onb-title">{t("onb.title")}</h2>
        <p className="onb-sub">{t("onb.subtitle")}</p>

        <ul className="onb-list">
          {BULLETS.map((b) => (
            <li key={b.key}>
              <span className="onb-ic">
                <Icon name={b.icon} size={16} />
              </span>
              <span>{t(b.key)}</span>
            </li>
          ))}
        </ul>

        <div className="onb-actions">
          <button className="btn btn-primary" onClick={loadSample}>
            <Icon name="sparkle" size={16} /> {t("onb.sample")}
          </button>
          <button className="btn" onClick={finish}>
            {t("onb.empty")}
          </button>
        </div>
      </div>
    </div>
  );
}
