import { useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { ACCENTS, useTheme } from "../theme";
import { useI18n, type Lang, type CalSystem } from "../i18n";
import { usePrefs } from "../prefs";
import { useStore } from "../domain/store";
import { useConfirm } from "../components/Confirm";
import { AccountSettings } from "../components/AccountSettings";
import { todayISO } from "../lib/date";
import { notifySupported, notifyBlocked, requestNotifyPermission } from "../lib/notify";
import type { PaceMode } from "../lib/tracking";

const PACE_MODES: PaceMode[] = ["exact", "normal", "easy"];
const PACE_LABEL: Record<PaceMode, string> = {
  exact: "settings.paceExact",
  normal: "settings.paceNormal",
  easy: "settings.paceEasy",
};
const PACE_HINT: Record<PaceMode, string> = {
  exact: "settings.paceExactHint",
  normal: "settings.paceNormalHint",
  easy: "settings.paceEasyHint",
};

export default function Settings() {
  const { mode, setMode, accent, setAccent } = useTheme();
  const { t, lang, setLang, cal, setCal } = useI18n();
  const { paceMode, setPaceMode, notify, setNotify } = usePrefs();

  const toggleNotify = async (on: boolean) => {
    if (!on) {
      setNotify(false);
      return;
    }
    setNotify(await requestNotifyPermission());
  };
  const { state, importState } = useStore();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const exportBackup = () => {
    const payload = JSON.stringify(
      {
        app: "facilitator-planner",
        version: 1,
        exportedAt: new Date().toISOString(),
        state,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planner-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file later
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const payload = data && data.state ? data.state : data;
      if (!(await confirm(t("settings.importConfirm")))) return;
      const ok = importState(payload);
      setBackupMsg({ ok, text: t(ok ? "settings.importOk" : "settings.importErr") });
    } catch {
      setBackupMsg({ ok: false, text: t("settings.importErr") });
    }
  };

  return (
    <>
      <header className="page-header">
        <h2>
          <Icon name="settings" size={22} /> {t("settings.title")}
        </h2>
      </header>

      <AccountSettings />

      <section className="card settings-group">
        <h3 className="settings-label">{t("settings.colorTheme")}</h3>
        <div className="theme-grid">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              className={"theme-card" + (accent === a.key ? " on" : "")}
              onClick={() => setAccent(a.key)}
            >
              <span className="theme-swatch" style={{ background: a.swatch }} />
              <span className="theme-name">{t("accent." + a.key)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-group">
        <h3 className="settings-label">{t("settings.mode")}</h3>
        <div className="seg">
          <button
            className={"seg-opt" + (mode === "light" ? " on" : "")}
            onClick={() => setMode("light")}
          >
            <Icon name="sun" size={16} /> {t("settings.light")}
          </button>
          <button
            className={"seg-opt" + (mode === "dark" ? " on" : "")}
            onClick={() => setMode("dark")}
          >
            <Icon name="moon" size={16} /> {t("settings.dark")}
          </button>
        </div>
      </section>

      <section className="card settings-group">
        <h3 className="settings-label">
          <Icon name="globe" size={16} /> {t("settings.language")}
        </h3>
        <div className="seg">
          {(["fa", "en"] as Lang[]).map((l) => (
            <button
              key={l}
              className={"seg-opt" + (lang === l ? " on" : "")}
              onClick={() => setLang(l)}
            >
              {l === "fa" ? t("settings.persian") : t("settings.english")}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-group">
        <h3 className="settings-label">
          <Icon name="calendar" size={16} /> {t("settings.calendar")}
        </h3>
        <div className="seg">
          {(["jalali", "gregorian", "both"] as CalSystem[]).map((c) => (
            <button
              key={c}
              className={"seg-opt" + (cal === c ? " on" : "")}
              onClick={() => setCal(c)}
            >
              {t("settings." + c)}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings-group">
        <h3 className="settings-label">
          <Icon name="clock" size={16} /> {t("settings.pace")}
        </h3>
        <p className="settings-desc">{t("settings.paceDesc")}</p>
        <div className="seg">
          {PACE_MODES.map((m) => (
            <button
              key={m}
              className={"seg-opt" + (paceMode === m ? " on" : "")}
              onClick={() => setPaceMode(m)}
            >
              {t(PACE_LABEL[m])}
            </button>
          ))}
        </div>
        <p className="settings-hint">{t(PACE_HINT[paceMode])}</p>
      </section>

      <section className="card settings-group">
        <h3 className="settings-label">
          <Icon name="bell" size={16} /> {t("settings.notify")}
        </h3>
        <p className="settings-desc">{t("settings.notifyDesc")}</p>
        {!notifySupported() ? (
          <p className="settings-hint">{t("settings.notifyUnsupported")}</p>
        ) : (
          <>
            <div className="seg">
              <button
                className={"seg-opt" + (notify ? " on" : "")}
                onClick={() => toggleNotify(true)}
              >
                {t("settings.on")}
              </button>
              <button
                className={"seg-opt" + (!notify ? " on" : "")}
                onClick={() => toggleNotify(false)}
              >
                {t("settings.off")}
              </button>
            </div>
            {notifyBlocked() && (
              <p className="settings-hint">{t("settings.notifyBlocked")}</p>
            )}
          </>
        )}
      </section>

      <section className="card settings-group">
        <h3 className="settings-label">
          <Icon name="note" size={16} /> {t("settings.backup")}
        </h3>
        <p className="settings-desc">{t("settings.backupDesc")}</p>
        <div className="backup-actions">
          <button className="btn" onClick={exportBackup}>
            <Icon name="check" size={16} /> {t("settings.export")}
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="repeat" size={16} /> {t("settings.import")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
            hidden
          />
        </div>
        {backupMsg && (
          <p className={"backup-msg " + (backupMsg.ok ? "ok" : "err")}>
            {backupMsg.text}
          </p>
        )}
      </section>
    </>
  );
}
