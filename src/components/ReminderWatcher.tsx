/* ============================================================
   Watches today's timed tasks and fires a local reminder when a
   task's start time arrives (while the app is open). Renders
   nothing. Reminders only run if the user enabled notifications.
   ============================================================ */

import { useEffect, useRef } from "react";
import { useStore } from "../domain/store";
import { usePrefs } from "../prefs";
import { useI18n } from "../i18n";
import { chime, showNotify } from "../lib/notify";
import { dayjs, todayISO, toFaDigits } from "../lib/date";

export function ReminderWatcher() {
  const { state } = useStore();
  const { notify } = usePrefs();
  const { t } = useI18n();
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notify) return;
    const check = () => {
      const today = todayISO();
      const now = dayjs().format("HH:mm");
      for (const tk of state.tasks) {
        if (tk.done || tk.date !== today || tk.startTime !== now) continue;
        const key = `${tk.id}|${today}|${tk.startTime}`;
        if (fired.current.has(key)) continue;
        fired.current.add(key);
        chime();
        showNotify(
          t("notify.taskTitle"),
          t("notify.taskBody", {
            title: tk.title,
            time: toFaDigits(tk.startTime!),
          })
        );
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [notify, state.tasks, t]);

  return null;
}
