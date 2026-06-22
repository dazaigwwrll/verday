/* ============================================================
   Occasions — Iranian official, religious, and world days, plus
   the user's own personal occasions. Fully OFFLINE: dates are
   computed with the browser's built-in Intl calendars (no network,
   no CDN). Everything is wrapped defensively so a calendar that
   isn't supported never breaks the rest of the app.

   Three fixed tables, matched against a date's parts:
     - Jalali-fixed   → national days (e.g. Nowruz)
     - Gregorian-fixed → world days (e.g. New Year)
     - Hijri-fixed    → religious days (lunar; via Intl islamic)
   Note: the Hijri (umalqura) calendar is arithmetic, so religious
   dates may differ ±1 day from the official observed date.
   ============================================================ */

import type { Occasion, OccasionKind } from "../domain/types";
import { jalaliParts, dayjs } from "./date";

export interface DayOccasion {
  id: string;
  title: string;
  kind: OccasionKind;
  holiday: boolean;
  source: "builtin" | "personal";
  /** True for lunar (Hijri) dates: computed, so may be ±1 day off the
   *  officially announced date. National/world dates are exact. */
  approx?: boolean;
  /** Day of mourning (عزا) — shown with a small black ribbon. */
  mourning?: boolean;
}

interface Entry {
  fa: string;
  en: string;
  kind: OccasionKind;
  holiday?: boolean;
  /** Day of mourning (عزا) — martyrdoms, Ashura/Tasua/Arbaeen, demises.
   *  Marked with a small black ribbon on the calendar. */
  mourning?: boolean;
}
interface JEntry extends Entry { jm: number; jd: number }
interface GEntry extends Entry { gm: number; gd: number }
interface HEntry extends Entry { hm: number; hd: number }

/* ---- Jalali-fixed: Iranian national days ---- */
const JALALI: JEntry[] = [
  { jm: 1, jd: 1, fa: "جشن نوروز — آغاز سال نو", en: "Nowruz (New Year)", kind: "iran-official", holiday: true },
  { jm: 1, jd: 2, fa: "عید نوروز", en: "Nowruz holiday", kind: "iran-official", holiday: true },
  { jm: 1, jd: 3, fa: "عید نوروز", en: "Nowruz holiday", kind: "iran-official", holiday: true },
  { jm: 1, jd: 4, fa: "عید نوروز", en: "Nowruz holiday", kind: "iran-official", holiday: true },
  { jm: 1, jd: 12, fa: "روز جمهوری اسلامی", en: "Islamic Republic Day", kind: "iran-official", holiday: true },
  { jm: 1, jd: 13, fa: "روز طبیعت (سیزده‌به‌در)", en: "Nature Day (Sizdah Bedar)", kind: "iran-official", holiday: true },
  { jm: 3, jd: 14, fa: "رحلت امام خمینی", en: "Demise of Imam Khomeini", kind: "iran-official", holiday: true, mourning: true },
  { jm: 3, jd: 15, fa: "قیام ۱۵ خرداد", en: "15 Khordad Uprising", kind: "iran-official", holiday: true },
  { jm: 11, jd: 22, fa: "پیروزی انقلاب اسلامی", en: "Victory of the Revolution", kind: "iran-official", holiday: true },
  { jm: 12, jd: 29, fa: "روز ملی‌شدن صنعت نفت", en: "Oil Nationalization Day", kind: "iran-official", holiday: true },
  // cultural / observances (not days off)
  { jm: 2, jd: 11, fa: "روز کارگر", en: "Workers' Day", kind: "iran-official" },
  { jm: 2, jd: 12, fa: "روز معلم", en: "Teacher's Day", kind: "iran-official" },
  { jm: 7, jd: 1, fa: "بازگشایی مدارس", en: "Schools reopen", kind: "iran-official" },
  { jm: 8, jd: 13, fa: "روز دانش‌آموز", en: "Student Day", kind: "iran-official" },
  { jm: 9, jd: 16, fa: "روز دانشجو", en: "University Student Day", kind: "iran-official" },
  { jm: 9, jd: 30, fa: "شب یلدا (چله)", en: "Yalda Night", kind: "iran-official" },
];

/* ---- Gregorian-fixed: world days ---- */
const GREGORIAN: GEntry[] = [
  { gm: 1, gd: 1, fa: "سال نو میلادی", en: "New Year's Day", kind: "world" },
  { gm: 3, gd: 8, fa: "روز جهانی زن", en: "International Women's Day", kind: "world" },
  { gm: 4, gd: 22, fa: "روز جهانی زمین", en: "Earth Day", kind: "world" },
  { gm: 5, gd: 1, fa: "روز جهانی کارگر", en: "International Workers' Day", kind: "world" },
  { gm: 6, gd: 5, fa: "روز جهانی محیط زیست", en: "World Environment Day", kind: "world" },
  { gm: 10, gd: 5, fa: "روز جهانی معلم", en: "World Teachers' Day", kind: "world" },
  { gm: 11, gd: 20, fa: "روز جهانی کودک", en: "Universal Children's Day", kind: "world" },
  { gm: 12, gd: 10, fa: "روز جهانی حقوق بشر", en: "Human Rights Day", kind: "world" },
  { gm: 12, gd: 25, fa: "کریسمس", en: "Christmas", kind: "world" },
];

/* ---- Hijri-fixed: religious days (lunar) ---- */
const HIJRI: HEntry[] = [
  { hm: 1, hd: 9, fa: "تاسوعای حسینی", en: "Tasua", kind: "religious", holiday: true, mourning: true },
  { hm: 1, hd: 10, fa: "عاشورای حسینی", en: "Ashura", kind: "religious", holiday: true, mourning: true },
  { hm: 2, hd: 20, fa: "اربعین حسینی", en: "Arbaeen", kind: "religious", holiday: true, mourning: true },
  { hm: 2, hd: 28, fa: "رحلت پیامبر و شهادت امام حسن", en: "Demise of the Prophet & Imam Hasan", kind: "religious", holiday: true, mourning: true },
  { hm: 2, hd: 30, fa: "شهادت امام رضا (ع)", en: "Martyrdom of Imam Reza", kind: "religious", holiday: true, mourning: true },
  { hm: 3, hd: 8, fa: "شهادت امام حسن عسکری (ع)", en: "Martyrdom of Imam Hasan Askari", kind: "religious", holiday: true, mourning: true },
  { hm: 3, hd: 17, fa: "میلاد پیامبر و امام صادق (ع)", en: "Birth of the Prophet & Imam Sadiq", kind: "religious", holiday: true },
  { hm: 6, hd: 3, fa: "شهادت حضرت فاطمه (س)", en: "Martyrdom of Fatimah", kind: "religious", holiday: true, mourning: true },
  { hm: 6, hd: 20, fa: "ولادت حضرت فاطمه (روز مادر)", en: "Birth of Fatimah (Mother's Day)", kind: "religious" },
  { hm: 7, hd: 13, fa: "ولادت امام علی (روز پدر)", en: "Birth of Imam Ali (Father's Day)", kind: "religious", holiday: true },
  { hm: 7, hd: 27, fa: "مبعث پیامبر (ص)", en: "Mab'ath", kind: "religious", holiday: true },
  { hm: 8, hd: 15, fa: "نیمه شعبان (ولادت امام زمان)", en: "Mid-Sha'ban", kind: "religious", holiday: true },
  { hm: 9, hd: 1, fa: "آغاز ماه رمضان", en: "Start of Ramadan", kind: "religious" },
  { hm: 9, hd: 21, fa: "شهادت امام علی (ع)", en: "Martyrdom of Imam Ali", kind: "religious", holiday: true, mourning: true },
  { hm: 10, hd: 1, fa: "عید فطر", en: "Eid al-Fitr", kind: "religious", holiday: true },
  { hm: 10, hd: 2, fa: "تعطیل عید فطر", en: "Eid al-Fitr holiday", kind: "religious", holiday: true },
  { hm: 10, hd: 25, fa: "شهادت امام صادق (ع)", en: "Martyrdom of Imam Sadiq", kind: "religious", holiday: true, mourning: true },
  { hm: 12, hd: 9, fa: "روز عرفه", en: "Day of Arafah", kind: "religious" },
  { hm: 12, hd: 10, fa: "عید قربان", en: "Eid al-Adha", kind: "religious", holiday: true },
  { hm: 12, hd: 18, fa: "عید غدیر خم", en: "Eid al-Ghadir", kind: "religious", holiday: true },
];

/* ---- Exact official overrides, keyed by Gregorian ISO date ----
   The HIJRI table above is COMPUTED (umalqura) and can be ±1 day off
   the officially announced Iranian date. For any Jalali year listed in
   OVERRIDE_YEARS, the computed religious dates are switched OFF and only
   these exact, hand-verified dates are used (no "approx" tag).

   To lock a year: add its number to OVERRIDE_YEARS and list each
   religious holiday under its exact Gregorian ISO date. National
   (Jalali) and world (Gregorian) days stay exact automatically and
   need no overrides.

   Example for Jalali 1405:
     OVERRIDE_YEARS.add(1405)
     "2026-06-26": [{ fa: "عاشورای حسینی", en: "Ashura", kind: "religious", holiday: true }]
*/
const OVERRIDE_YEARS = new Set<number>();
const OVERRIDES: Record<string, Entry[]> = {
  // filled from the official annual announcement, per OVERRIDE_YEARS
};

/* Built-in, offline Hijri formatter. Created lazily + guarded so an
   environment without the islamic calendar can't crash the app. */
let hijriFmt: Intl.DateTimeFormat | null = null;
let hijriOK = true;
function getHijriFmt(): Intl.DateTimeFormat | null {
  if (!hijriOK) return null;
  if (hijriFmt) return hijriFmt;
  try {
    hijriFmt = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    return hijriFmt;
  } catch {
    hijriOK = false;
    return null;
  }
}

/** Hijri month/day for an ISO date, or null if unsupported. */
export function hijriParts(iso: string): { hm: number; hd: number } | null {
  const fmt = getHijriFmt();
  if (!fmt) return null;
  try {
    const parts = fmt.formatToParts(new Date(iso + "T12:00:00"));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    const hm = get("month");
    const hd = get("day");
    if (!hm || !hd) return null;
    return { hm, hd };
  } catch {
    return null;
  }
}

function mk(
  e: Entry,
  lang: "fa" | "en",
  id: string,
  approx = false
): DayOccasion {
  return {
    id,
    title: lang === "en" ? e.en : e.fa,
    kind: e.kind,
    holiday: !!e.holiday,
    source: "builtin",
    approx,
    mourning: !!e.mourning,
  };
}

/** Built-in occasions for a date (national + world + religious). */
export function builtinOccasions(iso: string, lang: "fa" | "en"): DayOccasion[] {
  const out: DayOccasion[] = [];
  try {
    const j = jalaliParts(iso);
    for (const e of JALALI)
      if (e.jm === j.jm && e.jd === j.jd) out.push(mk(e, lang, `j-${e.jm}-${e.jd}`));

    const g = dayjs(iso);
    const gm = g.month() + 1;
    const gd = g.date();
    for (const e of GREGORIAN)
      if (e.gm === gm && e.gd === gd) out.push(mk(e, lang, `g-${e.gm}-${e.gd}`));

    // Religious days: exact overrides for covered years, else computed.
    if (OVERRIDE_YEARS.has(j.jy)) {
      const ov = OVERRIDES[iso];
      if (ov) ov.forEach((e, i) => out.push(mk(e, lang, `o-${iso}-${i}`, false)));
    } else {
      const h = hijriParts(iso);
      if (h)
        for (const e of HIJRI)
          if (e.hm === h.hm && e.hd === h.hd)
            out.push(mk(e, lang, `h-${e.hm}-${e.hd}`, true));
    }
  } catch {
    // never let occasion lookup break the calendar
  }
  return out;
}

/** Personal occasions stored by the user; recurring matches the
 *  same Jalali month/day each year. */
export function personalOccasions(iso: string, occ: Occasion[]): DayOccasion[] {
  let j: ReturnType<typeof jalaliParts> | null = null;
  try {
    j = jalaliParts(iso);
  } catch {
    j = null;
  }
  return occ
    .filter((o) => {
      if (o.date === iso) return true;
      if (o.recurring && j) {
        try {
          const oj = jalaliParts(o.date);
          return oj.jm === j.jm && oj.jd === j.jd;
        } catch {
          return false;
        }
      }
      return false;
    })
    .map((o) => ({
      id: o.id,
      title: o.title,
      kind: o.kind,
      holiday: !!o.holiday,
      source: "personal" as const,
    }));
}

/** All occasions (built-in + personal) for one day. */
export function occasionsForISO(
  iso: string,
  lang: "fa" | "en",
  occ: Occasion[]
): DayOccasion[] {
  return [...builtinOccasions(iso, lang), ...personalOccasions(iso, occ)];
}

/** Whether a day is a public holiday: Friday, or any holiday occasion. */
export function isHolidayISO(iso: string, occ: Occasion[]): boolean {
  try {
    if (jalaliParts(iso).weekday === 6) return true; // Friday = weekly day off
  } catch {
    /* ignore */
  }
  return occasionsForISO(iso, "fa", occ).some((o) => o.holiday);
}
