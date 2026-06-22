/* ============================================================
   Icons — simple, single-stroke line icons. No emojis.
   Inherit color via currentColor; size via the `size` prop.
   ============================================================ */

type IconName =
  | "home"
  | "target"
  | "year"
  | "month"
  | "week"
  | "day"
  | "layers"
  | "calendar"
  | "clock"
  | "sun"
  | "moon"
  | "plus"
  | "minus"
  | "check"
  | "trash"
  | "heart"
  | "droplet"
  | "habit"
  | "sparkle"
  | "flag"
  | "leaf"
  | "flame"
  | "ban"
  | "trophy"
  | "bell"
  | "alert"
  | "star"
  | "postpone"
  | "target-sm"
  | "chart"
  | "glass"
  | "chevron"
  | "repeat"
  | "list"
  | "settings"
  | "globe"
  | "play"
  | "stop"
  | "search"
  | "tag"
  | "note"
  | "grip"
  | "user"
  | "cloud-off";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  year: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  month: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  week: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="M7 14h10" />
    </>
  ),
  day: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <rect x="7" y="13" width="4" height="4" rx="0.5" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  moon: <path d="M21 12.8A8.5 8.5 0 1111.2 3a6.5 6.5 0 009.8 9.8z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12l5 5L20 6" />,
  heart: (
    <path d="M12 20s-7-4.3-9.3-8.5C1.2 8.7 2.6 5.5 5.7 5.1c1.9-.2 3.4.9 4.3 2.2.9-1.3 2.4-2.4 4.3-2.2 3.1.4 4.5 3.6 3 6.4C19 15.7 12 20 12 20z" />
  ),
  droplet: <path d="M12 3c3 4 6 7 6 10.5A6 6 0 016 13.5C6 10 9 7 12 3z" />,
  habit: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M7 16l3-4 3 2 4-6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 3 2 3H5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-7 5-12 14-13 0 9-5 14-12 14a6 6 0 01-2-1z" />
      <path d="M9 16c2-3 4-5 7-6" />
    </>
  ),
  flame: (
    <path d="M12 3c1 3 4 4.5 4 8a4 4 0 11-8 0c0-1.2.5-2 1-2.7C9 9.8 11 8 12 3z" />
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 01-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" />
      <path d="M9 16h6M10 16l-.5 4h5l-.5-4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <path d="M10 19a2 2 0 004 0" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4M12 17.5v.5" />
    </>
  ),
  star: (
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
  ),
  postpone: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="M11 14h5M14 11l3 3-3 3" />
    </>
  ),
  "target-sm": (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <rect x="7" y="11" width="3" height="6" rx="0.5" />
      <rect x="12" y="8" width="3" height="9" rx="0.5" />
      <rect x="17" y="13" width="3" height="4" rx="0.5" />
    </>
  ),
  glass: (
    <>
      <path d="M7 4h10l-1.1 15.2a1 1 0 01-1 .8H9.1a1 1 0 01-1-.8L7 4z" />
      <path d="M7.5 9.5h9" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  repeat: (
    <>
      <path d="M4 11V9a4 4 0 014-4h9" />
      <path d="M14 2l3 3-3 3" />
      <path d="M20 13v2a4 4 0 01-4 4H7" />
      <path d="M10 22l-3-3 3-3" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5l1.4 2.3 2.7-.4.6 2.6 2.4 1.2-1 2.5 1 2.5-2.4 1.2-.6 2.6-2.7-.4L12 21.5l-1.4-2.3-2.7.4-.6-2.6L4.9 15.8l1-2.5-1-2.5 2.4-1.2.6-2.6 2.7.4z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5z" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  tag: (
    <>
      <path d="M4 4h7l9 9-7 7-9-9V4z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  note: (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h5" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
    </>
  ),
  "cloud-off": (
    <>
      <path d="M6.5 18A4.5 4.5 0 015 9.2 6 6 0 0116 7.5" />
      <path d="M19.5 12.5A4 4 0 0118 18H9" />
      <path d="M3 3l18 18" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
