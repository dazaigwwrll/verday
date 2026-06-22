/* ============================================================
   Focus (Pomodoro) timer — a small global context so the timer
   keeps running while you move between pages, and resumes after
   a reload. Time is tracked by an absolute end-timestamp, so it
   stays correct even if the tab is backgrounded. Fully offline.
   ============================================================ */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { todayISO } from "./lib/date";
import { usePrefs } from "./prefs";
import { useI18n } from "./i18n";
import { chime, showNotify } from "./lib/notify";

export type FocusPhase = "idle" | "work" | "break";

const KEY = "planner.focus.v1";

interface Persisted {
  phase: FocusPhase;
  running: boolean;
  endsAt: number | null;
  pausedMs: number;
  workMin: number;
  breakMin: number;
  completed: number;
  completedDate: string;
  taskId?: string;
}

function load(): Persisted {
  const base: Persisted = {
    phase: "idle",
    running: false,
    endsAt: null,
    pausedMs: 0,
    workMin: 25,
    breakMin: 5,
    completed: 0,
    completedDate: todayISO(),
    taskId: undefined,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const p = { ...base, ...(JSON.parse(raw) as Partial<Persisted>) };
    if (p.completedDate !== todayISO()) {
      p.completed = 0;
      p.completedDate = todayISO();
    }
    return p;
  } catch {
    return base;
  }
}

interface FocusValue {
  phase: FocusPhase;
  running: boolean;
  remainingMs: number;
  totalMs: number;
  workMin: number;
  breakMin: number;
  completed: number;
  taskId?: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setWorkMin: (m: number) => void;
  setBreakMin: (m: number) => void;
  setTask: (id?: string) => void;
}

const FocusContext = createContext<FocusValue | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(load);
  const [, tick] = useState(0);
  const finishing = useRef(false);
  const { notify } = usePrefs();
  const { t } = useI18n();

  // persist on every change
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(s));
  }, [s]);

  // 1s heartbeat while running
  useEffect(() => {
    if (!s.running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [s.running]);

  const phaseLen = (phase: FocusPhase) =>
    (phase === "break" ? s.breakMin : s.workMin) * 60000;

  const remainingMs = s.running && s.endsAt
    ? Math.max(0, s.endsAt - Date.now())
    : s.phase === "idle"
    ? phaseLen("work")
    : s.pausedMs;

  const totalMs = s.phase === "idle" ? phaseLen("work") : phaseLen(s.phase);

  // when a running phase reaches zero, advance to the next phase
  useEffect(() => {
    if (!s.running || !s.endsAt) return;
    if (Date.now() < s.endsAt) return;
    if (finishing.current) return;
    finishing.current = true;
    // only alert for a fresh, real-time completion (not a stale resume)
    if (notify && Date.now() - s.endsAt < 4000) {
      chime();
      if (s.phase === "work")
        showNotify(t("focus.notifyBreakTitle"), t("focus.notifyBreakBody"));
      else showNotify(t("focus.notifyWorkTitle"), t("focus.notifyWorkBody"));
    }
    setS((prev) => {
      const wasWork = prev.phase === "work";
      const sameDay = prev.completedDate === todayISO();
      if (wasWork) {
        // work done → auto-start a break, count the pomodoro
        return {
          ...prev,
          phase: "break",
          running: true,
          endsAt: Date.now() + prev.breakMin * 60000,
          pausedMs: 0,
          completed: (sameDay ? prev.completed : 0) + 1,
          completedDate: todayISO(),
        };
      }
      // break done → wait at a fresh work session
      return {
        ...prev,
        phase: "work",
        running: false,
        endsAt: null,
        pausedMs: prev.workMin * 60000,
      };
    });
    finishing.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const start = () =>
    setS((p) => {
      const ms = p.phase === "idle" ? p.workMin * 60000 : p.pausedMs || phaseLen(p.phase);
      return {
        ...p,
        phase: p.phase === "idle" ? "work" : p.phase,
        running: true,
        endsAt: Date.now() + ms,
        pausedMs: 0,
      };
    });

  const pause = () =>
    setS((p) => ({
      ...p,
      running: false,
      pausedMs: p.endsAt ? Math.max(0, p.endsAt - Date.now()) : p.pausedMs,
      endsAt: null,
    }));

  const reset = () =>
    setS((p) => ({ ...p, phase: "idle", running: false, endsAt: null, pausedMs: 0 }));

  const skip = () =>
    setS((p) => {
      if (p.phase === "work") {
        const sameDay = p.completedDate === todayISO();
        return {
          ...p,
          phase: "break",
          running: false,
          endsAt: null,
          pausedMs: p.breakMin * 60000,
          completed: (sameDay ? p.completed : 0) + 1,
          completedDate: todayISO(),
        };
      }
      return {
        ...p,
        phase: "work",
        running: false,
        endsAt: null,
        pausedMs: p.workMin * 60000,
      };
    });

  const setWorkMin = (m: number) =>
    setS((p) => ({
      ...p,
      workMin: m,
      pausedMs: p.phase === "idle" || (p.phase === "work" && !p.running) ? m * 60000 : p.pausedMs,
    }));
  const setBreakMin = (m: number) =>
    setS((p) => ({
      ...p,
      breakMin: m,
      pausedMs: p.phase === "break" && !p.running ? m * 60000 : p.pausedMs,
    }));
  const setTask = (id?: string) => setS((p) => ({ ...p, taskId: id }));

  return (
    <FocusContext.Provider
      value={{
        phase: s.phase,
        running: s.running,
        remainingMs,
        totalMs,
        workMin: s.workMin,
        breakMin: s.breakMin,
        completed: s.completed,
        taskId: s.taskId,
        start,
        pause,
        reset,
        skip,
        setWorkMin,
        setBreakMin,
        setTask,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFocus(): FocusValue {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}
