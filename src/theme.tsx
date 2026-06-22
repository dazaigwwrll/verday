/* ============================================================
   Theme — two axes: mode (light/dark) and accent palette.
   Both persist and apply as data-theme / data-accent on <html>.
   ============================================================ */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark";
export type Accent =
  | "blue"
  | "teal"
  | "green"
  | "yellow"
  | "coral"
  | "rose"
  | "purple"
  | "mocha"
  | "plum"
  | "slate"
  | "wine";

export const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: "blue", label: "آبی آسمانی", swatch: "linear-gradient(135deg,#5b9df0,#7c7ff2)" },
  { key: "teal", label: "ماچا", swatch: "linear-gradient(135deg,#7eb253,#a4cd6c)" },
  { key: "green", label: "صنوبری", swatch: "linear-gradient(135deg,#1fa17a,#46bd86)" },
  { key: "yellow", label: "عسلی", swatch: "linear-gradient(135deg,#e9b84e,#f0a35a)" },
  { key: "coral", label: "مرجانی", swatch: "linear-gradient(135deg,#f08e72,#ee7a9c)" },
  { key: "rose", label: "صورتی", swatch: "linear-gradient(135deg,#e87fae,#c585e6)" },
  { key: "purple", label: "یاسی", swatch: "linear-gradient(135deg,#9d83ea,#7e8cf1)" },
  { key: "mocha", label: "موکا", swatch: "linear-gradient(135deg,#a9846a,#c5a585)" },
  { key: "plum", label: "آلویی", swatch: "linear-gradient(135deg,#a85c8d,#c074a4)" },
  { key: "slate", label: "دودی", swatch: "linear-gradient(135deg,#5f7088,#8693a6)" },
  { key: "wine", label: "شرابی", swatch: "linear-gradient(135deg,#b05068,#c76f7f)" },
];

const MODE_KEY = "planner.theme.v1";
const ACCENT_KEY = "planner.accent.v1";

function initialMode(): ThemeMode {
  const saved = localStorage.getItem(MODE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function initialAccent(): Accent {
  const saved = localStorage.getItem(ACCENT_KEY) as Accent | null;
  return saved && ACCENTS.some((a) => a.key === saved) ? saved : "blue";
}

interface ThemeContextValue {
  mode: ThemeMode;
  accent: Accent;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [accent, setAccent] = useState<Accent>(initialAccent);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accent,
        setMode,
        setAccent,
        toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
