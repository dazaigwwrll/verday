/* ============================================================
   Local notifications + a gentle chime. Works offline while the
   app/PWA is open — no server, no push. (True background push,
   when the app is closed, belongs to the future sync server.)
   Everything is guarded so an unsupported browser never throws.
   ============================================================ */

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyGranted(): boolean {
  return notifySupported() && Notification.permission === "granted";
}

export function notifyBlocked(): boolean {
  return notifySupported() && Notification.permission === "denied";
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

/** Show a notification — via the service worker if available (needed on
 *  Android), else the plain Notification constructor (desktop). */
export async function showNotify(title: string, body: string): Promise<void> {
  if (!notifyGranted()) return;
  const opts: NotificationOptions = { body, icon: "/icon.svg", badge: "/icon.svg" };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, opts);
        return;
      }
    }
    new Notification(title, opts);
  } catch {
    /* ignore — never let a notification break the app */
  }
}

let audioCtx: AudioContext | null = null;

/** A short, soft two-tone chime via Web Audio (no audio file). */
export function chime(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const now = audioCtx.currentTime;
    [660, 880].forEach((freq, i) => {
      const o = audioCtx!.createOscillator();
      const g = audioCtx!.createGain();
      o.connect(g);
      g.connect(audioCtx!.destination);
      o.type = "sine";
      o.frequency.value = freq;
      const t = now + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t);
      o.stop(t + 0.32);
    });
  } catch {
    /* ignore */
  }
}
