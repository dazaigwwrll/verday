/* ============================================================
   Mood — 5 simple line faces (no emoji). Minimal & a touch
   playful via the mouth curve. Used by the picker and charts.
   ============================================================ */

import type { MoodLevel } from "../domain/types";

const MOUTHS: Record<MoodLevel, string> = {
  5: "M8 13.5c1.6 2.8 6.8 2.8 8 0", // big smile
  4: "M8.5 14c1.4 1.6 5.6 1.6 7 0", // smile
  3: "M9 15h6", // flat
  2: "M8.5 15.6c1.4-1.4 5.6-1.4 7 0", // slight frown
  1: "M8 16.5c1.6-2.8 6.8-2.8 8 0", // frown
};

export const MOOD_LABELS: Record<MoodLevel, string> = {
  5: "عالی",
  4: "خوب",
  3: "معمولی",
  2: "بی‌حال",
  1: "بد",
};

export const MOOD_LEVELS: MoodLevel[] = [5, 4, 3, 2, 1];

export function MoodFace({
  level,
  size = 32,
  className,
}: {
  level: MoodLevel;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <path d={MOUTHS[level]} />
    </svg>
  );
}
