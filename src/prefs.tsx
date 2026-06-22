/* ============================================================
   Preferences — behavior settings that aren't theme or i18n.
   Currently: the time-tracking strictness band (paceMode).
   Persists to localStorage; chosen in Settings.
   ============================================================ */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PaceMode } from "./lib/tracking";

const PACE_KEY = "planner.pace.v1";
const NOTIFY_KEY = "planner.notify.v1";

function initialPace(): PaceMode {
  const saved = localStorage.getItem(PACE_KEY);
  if (saved === "exact" || saved === "normal" || saved === "easy") return saved;
  return "normal";
}

function initialNotify(): boolean {
  return localStorage.getItem(NOTIFY_KEY) === "1";
}

interface PrefsContextValue {
  paceMode: PaceMode;
  setPaceMode: (m: PaceMode) => void;
  notify: boolean;
  setNotify: (v: boolean) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [paceMode, setPaceMode] = useState<PaceMode>(initialPace);
  const [notify, setNotify] = useState<boolean>(initialNotify);

  useEffect(() => {
    localStorage.setItem(PACE_KEY, paceMode);
  }, [paceMode]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_KEY, notify ? "1" : "0");
  }, [notify]);

  return (
    <PrefsContext.Provider value={{ paceMode, setPaceMode, notify, setNotify }}>
      {children}
    </PrefsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
