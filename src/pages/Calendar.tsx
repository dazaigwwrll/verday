import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../domain/store";
import { Icon } from "../components/Icon";
import { useConfirm } from "../components/Confirm";
import { useI18n } from "../i18n";
import {
  occasionsForISO,
  isHolidayISO,
  type DayOccasion,
} from "../lib/occasions";
import type { OccasionKind } from "../domain/types";
import {
  dayjs,
  weekdaysShort,
  gregWeekdaysShort,
  gregMonths,
  formatJalaliMonth,
  formatJalaliFull,
  jalaliMonthLength,
  jalaliMonthStartISO,
  jalaliParts,
  parse,
  todayISO,
  toFaDigits,
} from "../lib/date";

const KIND_DOT: Record<OccasionKind, string> = {
  "iran-official": "dot-official",
  religious: "dot-religious",
  world: "dot-world",
  personal: "dot-personal",
};
const KIND_ORDER: OccasionKind[] = [
  "iran-official",
  "religious",
  "world",
  "personal",
];

export default function Calendar() {
  const { state, addOccasion, removeOccasion } = useStore();
  const { t, cal, lang } = useI18n();
  const confirm = useConfirm();
  const greg = cal === "gregorian";
  const today = todayISO();
  const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState<string | null>(today);

  // personal-occasion form
  const [occTitle, setOccTitle] = useState("");
  const [occKind, setOccKind] = useState<OccasionKind>("personal");
  const [occRecurring, setOccRecurring] = useState(true);
  const [occHoliday, setOccHoliday] = useState(false);

  // ----- shape of the displayed month, per calendar system -----
  let title: string;
  let weekdayNames: readonly string[];
  let firstWeekday: number;
  let length: number;
  let monthStartISO: string;

  if (greg) {
    const first = dayjs(today).startOf("month").add(offset, "month");
    title = `${gregMonths()[first.month()]} ${toFaDigits(first.year())}`;
    weekdayNames = gregWeekdaysShort();
    firstWeekday = first.day();
    length = first.daysInMonth();
    monthStartISO = first.format("YYYY-MM-DD");
  } else {
    const tp = jalaliParts(today);
    let jm = tp.jm + offset;
    let jy = tp.jy;
    while (jm < 1) {
      jm += 12;
      jy -= 1;
    }
    while (jm > 12) {
      jm -= 12;
      jy += 1;
    }
    title = formatJalaliMonth(jy, jm);
    weekdayNames = weekdaysShort();
    monthStartISO = jalaliMonthStartISO(jy, jm);
    firstWeekday = jalaliParts(monthStartISO).weekday;
    length = jalaliMonthLength(jy, jm);
  }

  const isoForDay = (d: number) =>
    parse(monthStartISO).add(d - 1, "day").format("YYYY-MM-DD");

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length }, (_, i) => i + 1),
  ];

  const selOccasions: DayOccasion[] = sel
    ? occasionsForISO(sel, lang, state.occasions)
    : [];
  const selTasks = sel
    ? state.tasks.filter((tk) => tk.date === sel).length
    : 0;

  const submitOccasion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel || !occTitle.trim()) return;
    addOccasion({
      title: occTitle.trim(),
      date: sel,
      kind: occKind,
      recurring: occRecurring,
      holiday: occHoliday,
    });
    setOccTitle("");
    setOccHoliday(false);
  };

  return (
    <>
      <header className="page-header cal-header">
        <div>
          <h2>{t("cal.title")}</h2>
          <p className="sub">{title}</p>
        </div>
        <div className="cal-nav">
          <button
            className="icon-btn"
            onClick={() => setOffset((o) => o - 1)}
            aria-label={t("cal.prevMonth")}
          >
            <Icon name="chevron" size={18} className="arrow-prev" />
          </button>
          <button className="btn" onClick={() => setOffset(0)}>
            {t("cal.today")}
          </button>
          <button
            className="icon-btn"
            onClick={() => setOffset((o) => o + 1)}
            aria-label={t("cal.nextMonth")}
          >
            <Icon name="chevron" size={18} className="arrow-next" />
          </button>
        </div>
      </header>

      <div className="cal-grid cal-weekdays">
        {weekdayNames.map((d, i) => (
          <div key={i} className="cal-weekday">
            {d}
          </div>
        ))}
      </div>

      <div className="cal-grid">
        {cells.map((d, i) => {
          if (d === null)
            return <div key={`b${i}`} className="cal-cell empty-cell" />;
          const iso = isoForDay(d);
          const occs = occasionsForISO(iso, lang, state.occasions);
          const kinds = KIND_ORDER.filter((k) => occs.some((o) => o.kind === k));
          const hasTasks = state.tasks.some((tk) => tk.date === iso);
          const holiday = isHolidayISO(iso, state.occasions);
          const mourning = occs.some((o) => o.mourning);
          const isToday = iso === today;
          const primary = greg ? d : jalaliParts(iso).jd;
          const secondary = cal === "both" ? dayjs(iso).date() : null;
          return (
            <button
              key={iso}
              className={
                "cal-cell" +
                (isToday ? " today" : "") +
                (sel === iso ? " selected" : "") +
                (holiday ? " holiday" : "")
              }
              onClick={() => setSel(iso)}
            >
              {mourning && <span className="cal-mourn" title={t("cal.mourning")} />}
              <span className="cal-day tnum">{toFaDigits(primary)}</span>
              {secondary !== null && (
                <span className="cal-day-2 tnum">{toFaDigits(secondary)}</span>
              )}
              <div className="cal-dots">
                {hasTasks && <span className="dot dot-task" />}
                {kinds.map((k) => (
                  <span key={k} className={"dot " + KIND_DOT[k]} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {sel && (
        <section className="card cal-day-panel">
          <div className="cal-panel-head">
            <h3>{formatJalaliFull(sel)}</h3>
            <Link to={`/?d=${sel}`} className="btn btn-primary cal-goto">
              <Icon name="home" size={15} /> {t("cal.goToDay")}
            </Link>
          </div>

          {selTasks > 0 && (
            <p className="cal-panel-tasks subtle">
              <Icon name="check" size={13} />{" "}
              {t("cal.tasksOnDay", { n: toFaDigits(selTasks) })}
            </p>
          )}

          {selOccasions.length === 0 ? (
            <p className="muted cal-no-occ">{t("cal.noOccasions")}</p>
          ) : (
            <ul className="occ-list">
              {selOccasions.map((o) => (
                <li key={o.id} className={"occ-item" + (o.holiday ? " holiday" : "")}>
                  {o.mourning && <span className="occ-mourn-bar" />}
                  <span className={"occ-kind-dot " + KIND_DOT[o.kind]} />
                  <span className="occ-title">{o.title}</span>
                  {o.mourning && <span className="occ-mourn-tag">{t("cal.mourning")}</span>}
                  {o.holiday && <span className="occ-holiday-tag">{t("cal.holiday")}</span>}
                  {o.approx && (
                    <span className="occ-approx" title={t("cal.approxHint")}>
                      {t("cal.approx")}
                    </span>
                  )}
                  <span className="occ-kind-label subtle">{t("occ." + o.kind)}</span>
                  {o.source === "personal" && (
                    <button
                      className="row-del"
                      onClick={async () => {
                        if (await confirm(t("cal.deleteOccasion")))
                          removeOccasion(o.id);
                      }}
                      aria-label={t("common.delete")}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form className="occ-add" onSubmit={submitOccasion}>
            <span className="field-label">{t("cal.addOccasion")}</span>
            <div className="occ-add-row">
              <input
                type="text"
                value={occTitle}
                onChange={(e) => setOccTitle(e.target.value)}
                placeholder={t("cal.occTitle")}
              />
              <select
                className="goal-select"
                value={occKind}
                onChange={(e) => setOccKind(e.target.value as OccasionKind)}
              >
                {KIND_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {t("occ." + k)}
                  </option>
                ))}
              </select>
              <button type="submit" className="icon-btn" aria-label={t("common.add")}>
                <Icon name="plus" size={18} />
              </button>
            </div>
            <div className="occ-add-opts">
              <label className="occ-check">
                <input
                  type="checkbox"
                  checked={occRecurring}
                  onChange={(e) => setOccRecurring(e.target.checked)}
                />
                {t("cal.recurring")}
              </label>
              <label className="occ-check">
                <input
                  type="checkbox"
                  checked={occHoliday}
                  onChange={(e) => setOccHoliday(e.target.checked)}
                />
                {t("cal.markHoliday")}
              </label>
            </div>
          </form>
        </section>
      )}

      <div className="cal-legend subtle">
        <span><span className="dot dot-task" /> {t("cal.legendTasks")}</span>
        <span><span className="dot dot-official" /> {t("occ.iran-official")}</span>
        <span><span className="dot dot-religious" /> {t("occ.religious")}</span>
        <span><span className="dot dot-world" /> {t("occ.world")}</span>
        <span><span className="dot dot-personal" /> {t("occ.personal")}</span>
      </div>

      <p className="sub cal-note">
        <Icon name="calendar" size={14} /> {t("cal.note")}
      </p>
    </>
  );
}
