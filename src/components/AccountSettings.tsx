/* ============================================================
   Account + sync controls for the Settings page.

   Sign in / register, see sync status, sync manually, and—when
   two devices disagree—resolve the conflict explicitly instead
   of losing data.
   ============================================================ */

import { useState } from "react";
import { Icon } from "./Icon";
import { useI18n } from "../i18n";
import { useSync, type SyncStatus } from "../sync";
import { ApiError } from "../lib/api";
import { useConfirm } from "./Confirm";

const STATUS_KEY: Record<SyncStatus, string> = {
  off: "sync.status.off",
  idle: "sync.status.idle",
  syncing: "sync.status.syncing",
  synced: "sync.status.synced",
  offline: "sync.status.offline",
  error: "sync.status.error",
  conflict: "sync.status.conflict",
};

export function AccountSettings() {
  const { t, lang } = useI18n();
  const {
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
  } = useSync();
  const confirm = useConfirm();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormErr(null);
    try {
      if (mode === "register") await register(email.trim(), password);
      else await login(email.trim(), password);
      setPassword("");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "server_error";
      setFormErr(t("sync.err." + code));
    } finally {
      setBusy(false);
    }
  };

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  /* ---- signed-out: auth form ---- */
  if (!session) {
    return (
      <section className="card settings-group">
        <h3 className="settings-label">
          <Icon name="user" size={16} /> {t("sync.title")}
        </h3>
        <p className="settings-desc">{t("sync.intro")}</p>

        <div className="seg auth-tabs">
          <button
            className={"seg-opt" + (mode === "login" ? " on" : "")}
            onClick={() => setMode("login")}
            type="button"
          >
            {t("sync.signIn")}
          </button>
          <button
            className={"seg-opt" + (mode === "register" ? " on" : "")}
            onClick={() => setMode("register")}
            type="button"
          >
            {t("sync.signUp")}
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <input
            className="auth-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("sync.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            placeholder={t("sync.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {mode === "register" && (
            <p className="settings-hint">{t("sync.passwordHint")}</p>
          )}
          {formErr && <p className="backup-msg err">{formErr}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy
              ? t("sync.working")
              : mode === "register"
              ? t("sync.signUp")
              : t("sync.signIn")}
          </button>
        </form>
        <p className="settings-hint">{t("sync.serverHint")}</p>
      </section>
    );
  }

  /* ---- signed-in: status + controls ---- */
  return (
    <section className="card settings-group">
      <h3 className="settings-label">
        <Icon name="user" size={16} /> {t("sync.title")}
      </h3>

      <div className="acct-row">
        <span className="acct-email">{session.email}</span>
        <span className={"sync-pill " + status}>
          {status === "syncing" && <Icon name="repeat" size={13} />}
          {status === "synced" && <Icon name="check" size={13} />}
          {status === "offline" && <Icon name="cloud-off" size={13} />}
          {status === "conflict" && <Icon name="alert" size={13} />}
          {t(STATUS_KEY[status])}
        </span>
      </div>

      {lastSyncedAt && (
        <p className="settings-hint">
          {t("sync.lastSynced", { time: fmtTime(lastSyncedAt) })}
        </p>
      )}
      {dirty && status !== "conflict" && (
        <p className="settings-hint">{t("sync.pending")}</p>
      )}
      {status === "error" && errorCode && (
        <p className="backup-msg err">{t("sync.err." + errorCode)}</p>
      )}
      {status === "offline" && (
        <p className="settings-hint">{t("sync.offlineHint")}</p>
      )}

      {/* conflict resolver — explicit, no silent data loss */}
      {status === "conflict" && (
        <div className="conflict-box">
          <p className="conflict-title">
            <Icon name="alert" size={15} /> {t("sync.conflictTitle")}
          </p>
          <p className="conflict-desc">{t("sync.conflictDesc")}</p>
          <div className="conflict-actions">
            <button className="btn" onClick={() => resolveConflict("merge")}>
              {t("sync.keepBoth")}
            </button>
            <button className="btn" onClick={() => resolveConflict("local")}>
              {t("sync.keepLocal")}
            </button>
            <button className="btn" onClick={() => resolveConflict("server")}>
              {t("sync.keepServer")}
            </button>
          </div>
          <p className="settings-hint">{t("sync.conflictHint")}</p>
        </div>
      )}

      <div className="backup-actions">
        <button
          className="btn"
          onClick={() => void syncNow()}
          disabled={status === "syncing"}
        >
          <Icon name="repeat" size={16} /> {t("sync.syncNow")}
        </button>
        <button className="btn" onClick={logout}>
          <Icon name="cloud-off" size={16} /> {t("sync.signOut")}
        </button>
      </div>

      <button
        className="btn danger-link"
        onClick={async () => {
          if (await confirm(t("sync.deleteConfirm"))) await deleteAccount();
        }}
      >
        {t("sync.deleteAccount")}
      </button>
    </section>
  );
}
