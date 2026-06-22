/* ============================================================
   Thin client for the optional sync server.

   Everything here is best-effort and offline-safe: every call
   can reject (no server / no internet) and callers must treat
   that as "stay local, try again later" — never as an error
   that breaks the app.
   ============================================================ */

import type { PlannerState } from "../domain/types";

/** Server base URL.
 *  - If VITE_API_URL is set at build time, use it (e.g. a separate
 *    API host).
 *  - In local dev, fall back to the local sync server.
 *  - In production with no override, use the same origin (""), so a
 *    unified deploy (web + /api together, e.g. on Vercel) just works
 *    with relative /api/* requests — no CORS, no config. */
const configured = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  ""
);
export const API_URL: string =
  configured ?? (import.meta.env.DEV ? "http://localhost:8787" : "");

export interface Session {
  token: string;
  email: string;
}

export interface RemoteState {
  state: PlannerState | null;
  rev: number;
  updatedAt: string | null;
}

/** Maps server error codes to a stable key the UI can translate. */
export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    // network down / server unreachable — distinct from an HTTP error
    throw new ApiError("offline", 0);
  }

  if (!res.ok) {
    let code = "server_error";
    try {
      const data = await res.json();
      if (data?.error) code = data.error;
    } catch {
      /* ignore parse error */
    }
    throw new ApiError(code, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  register: (email: string, password: string) =>
    request<Session>("/api/register", { method: "POST", body: { email, password } }),
  login: (email: string, password: string) =>
    request<Session>("/api/login", { method: "POST", body: { email, password } }),
  getState: (token: string) => request<RemoteState>("/api/state", { token }),
  putState: (token: string, state: PlannerState) =>
    request<{ rev: number; updatedAt: string }>("/api/state", {
      method: "PUT",
      token,
      body: { state },
    }),
  deleteAccount: (token: string) =>
    request<{ ok: boolean }>("/api/account", { method: "DELETE", token }),
};
