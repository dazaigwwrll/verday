/* ============================================================
   Date layer — Jalali (Shamsi) primary, Gregorian available.
   Built on dayjs + jalaliday. All planner dates are stored as
   ISO Gregorian strings (YYYY-MM-DD) internally and converted
   to Jalali only for display, so storage/sync stays unambiguous.
   ============================================================ */

import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Saturday-first week, matching the Iranian calendar. */
export const JALALI_WEEKDAYS = [
  "شنبه",
  "یک‌شنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
] as const;

export const JALALI_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

/* English (transliterated) Jalali names, used when language = en. */
const JALALI_MONTHS_EN = [
  "Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
  "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand",
] as const;
const JALALI_WEEKDAYS_EN = [
  "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
] as const;
const JALALI_WEEKDAYS_SHORT_EN = ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"] as const;

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/* Gregorian month / weekday names (Sunday-first), per locale. */
const GREG_MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const GREG_MONTHS_FA = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
] as const;
const GREG_WEEKDAYS_EN = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;
const GREG_WEEKDAYS_FA = [
  "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه",
] as const;
const GREG_WEEKDAYS_SHORT_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const GREG_WEEKDAYS_SHORT_FA = ["ی", "د", "س", "چ", "پ", "ج", "ش"] as const;

/* Active display locale; set by the i18n provider. Pure storage stays ISO. */
let LOCALE: "fa" | "en" = "fa";
export function setDateLocale(l: "fa" | "en") {
  LOCALE = l;
}

/* Active calendar system. */
export type CalSystem = "jalali" | "gregorian" | "both";
let CAL: CalSystem = "jalali";
export function setDateCalendar(c: CalSystem) {
  CAL = c;
}
export function getCalendar(): CalSystem {
  return CAL;
}

export function gregMonths(): readonly string[] {
  return LOCALE === "en" ? GREG_MONTHS_EN : GREG_MONTHS_FA;
}
export function gregWeekdays(): readonly string[] {
  return LOCALE === "en" ? GREG_WEEKDAYS_EN : GREG_WEEKDAYS_FA;
}
export function gregWeekdaysShort(): readonly string[] {
  return LOCALE === "en" ? GREG_WEEKDAYS_SHORT_EN : GREG_WEEKDAYS_SHORT_FA;
}

function gregLong(iso: string): string {
  const d = dayjs(iso);
  return `${toFaDigits(d.date())} ${gregMonths()[d.month()]} ${toFaDigits(d.year())}`;
}
function gregWeekdayName(iso: string): string {
  return gregWeekdays()[dayjs(iso).day()];
}

export function months(): readonly string[] {
  return LOCALE === "en" ? JALALI_MONTHS_EN : JALALI_MONTHS;
}
export function weekdays(): readonly string[] {
  return LOCALE === "en" ? JALALI_WEEKDAYS_EN : JALALI_WEEKDAYS;
}
export function weekdaysShort(): readonly string[] {
  return LOCALE === "en" ? JALALI_WEEKDAYS_SHORT_EN : JALALI_WEEKDAYS_SHORT;
}

/** Localize digits: Persian in fa, Latin in en. */
export function toFaDigits(input: string | number): string {
  if (LOCALE === "en") return String(input);
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export interface JalaliParts {
  jy: number;
  jm: number; // 1..12
  jd: number; // 1..31
  /** day of week, 0 = Saturday .. 6 = Friday */
  weekday: number;
}

function toJalali(date: dayjs.Dayjs): JalaliParts {
  const j = date.calendar("jalali");
  // dayjs day(): 0=Sunday..6=Saturday → shift so Saturday=0
  const weekday = (j.day() + 1) % 7;
  return { jy: j.year(), jm: j.month() + 1, jd: j.date(), weekday };
}

/** Today as a Gregorian ISO date string (YYYY-MM-DD), no time. */
export function todayISO(): string {
  return dayjs().format("YYYY-MM-DD");
}

export function parse(iso: string): dayjs.Dayjs {
  return dayjs(iso);
}

export function jalaliParts(iso: string): JalaliParts {
  return toJalali(dayjs(iso));
}

function jalaliLong(iso: string): string {
  const { jy, jm, jd } = jalaliParts(iso);
  return `${toFaDigits(jd)} ${months()[jm - 1]} ${toFaDigits(jy)}`;
}

/** Long date in the active calendar system. */
export function formatJalaliLong(iso: string): string {
  if (CAL === "gregorian") return gregLong(iso);
  if (CAL === "both") return `${jalaliLong(iso)} (${gregLong(iso)})`;
  return jalaliLong(iso);
}

/** Weekday + long date, in the active calendar system. */
export function formatJalaliFull(iso: string): string {
  const sep = LOCALE === "en" ? ", " : "، ";
  const wd =
    CAL === "gregorian"
      ? gregWeekdayName(iso)
      : weekdays()[jalaliParts(iso).weekday];
  return `${wd}${sep}${formatJalaliLong(iso)}`;
}

/** "خرداد ۱۴۰۴" / "Khordad 1405" */
export function formatJalaliMonth(jy: number, jm: number): string {
  return `${months()[jm - 1]} ${toFaDigits(jy)}`;
}

/** Number of days in a given Jalali month. */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand: 30 in leap years, else 29
  return isJalaliLeap(jy) ? 30 : 29;
}

/** 33-year cycle leap-year rule for the Jalali calendar. */
export function isJalaliLeap(jy: number): boolean {
  const a = jy - (jy >= 0 ? 474 : 473);
  const b = (a % 2820) + 474;
  return ((b + 38) * 31) % 128 < 31;
}

/** ISO date string for the first day of a Jalali month. */
export function jalaliMonthStartISO(jy: number, jm: number): string {
  return dayjs(`${jy}-${jm}-1`, { jalali: true } as never)
    .calendar("gregory")
    .format("YYYY-MM-DD");
}

/** Shift an ISO date by n days (n may be negative). */
export function addDays(iso: string, n: number): string {
  return dayjs(iso).add(n, "day").format("YYYY-MM-DD");
}

/** Saturday that starts the (Iranian) week containing iso. */
export function weekStartISO(iso: string): string {
  return addDays(iso, -jalaliParts(iso).weekday);
}

/** Shift a Jalali year+month by n months, wrapping years. */
export function jalaliAddMonths(jy: number, jm: number, n: number): { jy: number; jm: number } {
  const total = jy * 12 + (jm - 1) + n;
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1 };
}

/** The Saturday week-starts whose week overlaps the given Jalali month. */
export function jalaliMonthWeekStarts(jy: number, jm: number): string[] {
  const monthStart = jalaliMonthStartISO(jy, jm);
  const monthEnd = addDays(monthStart, jalaliMonthLength(jy, jm) - 1);
  const out: string[] = [];
  let ws = weekStartISO(monthStart);
  while (ws <= monthEnd) {
    out.push(ws);
    ws = addDays(ws, 7);
  }
  return out;
}

/** Short range label for a week, in the active calendar system. */
export function formatWeekRange(startISO: string): string {
  const endISO = addDays(startISO, 6);
  const gregPart = () => {
    const s = dayjs(startISO);
    const e = dayjs(endISO);
    return s.month() === e.month()
      ? `${toFaDigits(s.date())}–${toFaDigits(e.date())} ${gregMonths()[s.month()]}`
      : `${toFaDigits(s.date())} ${gregMonths()[s.month()]} – ${toFaDigits(e.date())} ${gregMonths()[e.month()]}`;
  };
  if (CAL === "gregorian") return gregPart();
  const a = jalaliParts(startISO);
  const b = jalaliParts(endISO);
  const jr =
    a.jm === b.jm
      ? `${toFaDigits(a.jd)}–${toFaDigits(b.jd)} ${months()[a.jm - 1]}`
      : `${toFaDigits(a.jd)} ${months()[a.jm - 1]} – ${toFaDigits(b.jd)} ${months()[b.jm - 1]}`;
  return CAL === "both" ? `${jr} (${gregPart()})` : jr;
}

/** "Today/Tomorrow/Yesterday" (localized) when near, else the weekday name. */
export function relativeDayLabel(iso: string): string {
  const diff = dayjs(iso).startOf("day").diff(dayjs(todayISO()).startOf("day"), "day");
  const rel =
    LOCALE === "en"
      ? { 0: "Today", 1: "Tomorrow", "-1": "Yesterday" }
      : { 0: "امروز", 1: "فردا", "-1": "دیروز" };
  if (diff === 0 || diff === 1 || diff === -1)
    return rel[diff as 0 | 1 | -1];
  return weekdays()[jalaliParts(iso).weekday];
}

export { dayjs };
