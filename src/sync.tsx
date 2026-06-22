/* ============================================================
   Sync layer — optional accounts + cross-device sync.

   Core promise: this NEVER breaks the offline app. localStorage
   stays the source of truth; syncing is an additive background
   layer. If the server is down or the user is offline, the app
   keeps working and we simply retry later.

   When both this device and the server changed since the last
   sync, we do NOT overwrite blindly — we surface a conflict and
   let the user choose (keep this device / keep server / merge).
   ============================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, type RemoteState, type Session } from "./lib/api";
import { fingerprint, mergeStates } from "./lib/merge";
import { useStore } from "./domain/store";
import type { PlannerState } from "./domain/types";

const AUTH_KEY = "planner.auth.v1";
const META_KEY = "planner.sync.v1";

export type SyncStatus =
  | "off" // not signed in
  | "idle" // signed in, nothing pending
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "conflict";

interface SyncMeta {
  rev: number;
  fp: string;
}

interface SyncContextValue {
  session: Session | null;
  status: SyncStatus;
  /** error code from the server/network, for translation */
  errorCode: string | null;
  lastSyncedAt: string | null;
  dirty: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  syncNow: () => Promise<void>;
  resolveConflict: (choice: "local" | "server" | "merge") => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as SyncMeta;
  } catch {
    /* ignore */
  }
  return { rev: 0, fp: "" };
}

function isEmptyState(s: PlannerState): boolean {
  return (
    s.goals.length === 0 &&
    s.tasks.length === 0 &&
    s.habits.length === 0 &&
    s.dailyLogs.length === 0 &&
    s.occasions.length === 0 &&
    s.recurrences.length === 0 &&
    Object.keys(s.reviews).length === 0 &&
    Object.keys(s.habitDays).length === 0
  );
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, importState } = useStore();
  const [session, setSession] = useState<Session | null>(loadSession);
  const [status, setStatus] = useState<SyncStatus>(() =>
    loadSession() ? "idle" : "off"
  );
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RemoteState | null>(null);

  // sync bookkeeping kept in a ref so it doesn't trigger renders
  const meta = useRef<SyncMeta>(loadMeta());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);

  const localFp = fingerprint(state);
  const dirty = !!session && localFp !== meta.current.fp;

  const persistMeta = useCallback((m: SyncMeta) => {
    meta.current = m;
    try {
      localStorage.setItem(META_KEY, JSON.stringify(m));
    } catch {
      /* ignore */
    }
  }, []);

  const markSynced = useCallback(
    (rev: number, fp: string) => {
      persistMeta({ rev, fp });
      setLastSyncedAt(new Date().toISOString());
      setStatus("synced");
      setErrorCode(null);
    },
    [persistMeta]
  );

  const handleError = useCallback((e: unknown) => {
    if (e instanceof ApiError) {
      if (e.code === "offline") {
        setStatus("offline");
        return;
      }
      // token expired / user gone — drop the dead session, keep local data
      if (e.status === 401) {
        try {
          localStorage.removeItem(AUTH_KEY);
        } catch {
          /* ignore */
        }
        setSession(null);
        setStatus("off");
        setErrorCode("session_expired");
        return;
      }
      setErrorCode(e.code);
    } else {
      setErrorCode("server_error");
    }
    setStatus("error");
  }, []);

  /** Push an explicit state to the server and mark it as synced. */
  const pushState = useCallback(
    async (token: string, s: PlannerState) => {
      const res = await api.putState(token, s);
      markSynced(res.rev, fingerprint(s));
    },
    [markSynced]
  );

  const syncNow = useCallback(async () => {
    if (!session || running.current) return;
    running.current = true;
    setStatus("syncing");
    try {
      const remote = await api.getState(session.token);
      const curFp = fingerprint(state);
      const localDirty = curFp !== meta.current.fp;
      const serverNewer = remote.rev > meta.current.rev;

      if (!remote.state) {
        // server has nothing yet → seed it with our local data
        await pushState(session.token, state);
      } else if (!localDirty && !serverNewer) {
        markSynced(remote.rev, curFp);
      } else if (serverNewer && (!localDirty || isEmptyState(state))) {
        // server moved ahead and we have no competing changes → adopt it
        importState(remote.state);
        markSynced(remote.rev, fingerprint(remote.state));
      } else if (localDirty && !serverNewer) {
        await pushState(session.token, state);
      } else {
        // both sides changed since last sync — never overwrite silently
        setConflict(remote);
        setStatus("conflict");
      }
    } catch (e) {
      handleError(e);
    } finally {
      running.current = false;
    }
  }, [session, state, importState, markSynced, pushState, handleError]);

  const resolveConflict = useCallback(
    async (choice: "local" | "server" | "merge") => {
      if (!session || !conflict || !conflict.state) return;
      setStatus("syncing");
      try {
        if (choice === "server") {
          importState(conflict.state);
          markSynced(conflict.rev, fingerprint(conflict.state));
        } else if (choice === "local") {
          await pushState(session.token, state);
        } else {
          const merged = mergeStates(state, conflict.state);
          importState(merged);
          await pushState(session.token, merged);
        }
        setConflict(null);
      } catch (e) {
        handleError(e);
      }
    },
    [session, conflict, state, importState, markSynced, pushState, handleError]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const s = await api.register(email, password);
      persistMeta({ rev: 0, fp: "" });
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(s));
      } catch {
        /* ignore */
      }
      setErrorCode(null);
      setSession(s);
    },
    [persistMeta]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const s = await api.login(email, password);
      persistMeta({ rev: 0, fp: "" });
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify(s));
      } catch {
        /* ignore */
      }
      setErrorCode(null);
      setSession(s);
    },
    [persistMeta]
  );

  const logout = useCallback(() => {
    // sign out only — local data is untouched and keeps working
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    persistMeta({ rev: 0, fp: "" });
    setSession(null);
    setConflict(null);
    setErrorCode(null);
    setStatus("off");
  }, [persistMeta]);

  const deleteAccount = useCallback(async () => {
    if (!session) return;
    try {
      await api.deleteAccount(session.token);
    } catch {
      /* even if it fails server-side, sign out locally */
    }
    logout();
  }, [session, logout]);

  // Sync right after sign-in.
  useEffect(() => {
    if (session) void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  // Auto-push local changes (debounced) while signed in & not mid-conflict.
  useEffect(() => {
    if (!session || status === "conflict" || !dirty) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void syncNow(), 3000);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [session, status, dirty, localFp, syncNow]);

  // Retry when the network comes back.
  useEffect(() => {
    const onOnline = () => {
      if (session && status !== "conflict") void syncNow();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session, status, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      session,
      status,
      errorCode,
      lastSyncedAt,
      dirty,
      register,
      login,
      logout,
      syncNow,
      resolveConflict,
      deleteAccount,
    }),
    [
      session,
      status,
      errorCode,
      lastSyncedAt,
      dirty,
      register,
      login,
      logout,
      syncNow,
      resolveConflict,
      deleteAccount,
    ]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
