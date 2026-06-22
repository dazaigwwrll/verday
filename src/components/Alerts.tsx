/* ============================================================
   Alerts panel — reminders for incomplete goals / passing time.
   Recomputes on a 1-minute tick. Text is localized here.
   ============================================================ */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../domain/store";
import { computeAlerts, type Alert, type AlertKind } from "../lib/alerts";
import { todayISO, toFaDigits } from "../lib/date";
import { useI18n } from "../i18n";
import { Icon } from "./Icon";

const ICONS: Record<
  AlertKind,
  "clock" | "alert" | "week" | "month" | "flag" | "chart" | "target"
> = {
  overdue: "alert",
  time: "clock",
  week: "week",
  month: "month",
  year: "flag",
  monthPace: "target",
  yearPace: "target",
  overplan: "chart",
};

export function Alerts() {
  const { state, rescheduleOverdue } = useStore();
  const { t } = useI18n();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const alerts = computeAlerts(state);
  if (alerts.length === 0) return null;

  const text = (a: Alert): string => {
    switch (a.kind) {
      case "overdue":
        return t("alerts.overdue", { n: toFaDigits(a.n ?? 0) });
      case "time":
        return t("alerts.time", { n: toFaDigits(a.n ?? 0) });
      case "week":
        return t("alerts.week", {
          n: toFaDigits(a.n ?? 0),
          d: toFaDigits(a.d ?? 0),
        });
      case "month":
        return t("alerts.month", {
          n: toFaDigits(a.n ?? 0),
          d: toFaDigits(a.d ?? 0),
        });
      case "year":
        return t("alerts.year", {
          n: toFaDigits(a.n ?? 0),
          d: toFaDigits(a.d ?? 0),
        });
      case "monthPace":
        return t("alerts.monthPace", {
          ep: toFaDigits(a.ep ?? 0),
          dp: toFaDigits(a.dp ?? 0),
        });
      case "yearPace":
        return t("alerts.yearPace", {
          ep: toFaDigits(a.ep ?? 0),
          dp: toFaDigits(a.dp ?? 0),
        });
      case "overplan": {
        const reason =
          a.reasonKind === "hours"
            ? t("alerts.reasonHours", { h: toFaDigits(a.reasonValue ?? 0) })
            : t("alerts.reasonTasks", { n: toFaDigits(a.reasonValue ?? 0) });
        return t("alerts.overplan", { reason });
      }
    }
  };

  return (
    <section className="alerts">
      <div className="alerts-head">
        <Icon name="bell" size={16} />
        <span>{t("alerts.title")}</span>
      </div>
      <div className="alerts-list">
        {alerts.map((a) =>
          a.kind === "overdue" ? (
            <div key={a.id} className="alert-row overdue">
              <Icon name={ICONS[a.kind]} size={16} />
              <span>{text(a)}</span>
              <button
                className="alert-action"
                onClick={() => rescheduleOverdue(todayISO())}
              >
                <Icon name="postpone" size={14} /> {t("alerts.moveAll")}
              </button>
            </div>
          ) : (
            <Link key={a.id} to={a.to} className={"alert-row " + a.kind}>
              <Icon name={ICONS[a.kind]} size={16} />
              <span>{text(a)}</span>
            </Link>
          )
        )}
      </div>
    </section>
  );
}
