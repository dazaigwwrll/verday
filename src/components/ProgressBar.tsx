/* ============================================================
   Reusable progress bar. Shows how much of something is done.
   Animated fill; optional label + count/percent.
   ============================================================ */

import { toFaDigits } from "../lib/date";

export function ProgressBar({
  done,
  total,
  label,
  showCount = true,
  tone = "accent",
}: {
  done: number;
  total: number;
  label?: string;
  showCount?: boolean;
  tone?: "accent" | "success";
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progress">
      {(label || showCount) && (
        <div className="progress-top">
          {label && <span className="progress-label">{label}</span>}
          {showCount && (
            <span className="progress-count tnum muted">
              {total === 0
                ? "—"
                : `${toFaDigits(done)}/${toFaDigits(total)} · ${toFaDigits(
                    pct
                  )}%`}
            </span>
          )}
        </div>
      )}
      <div className="bar">
        <span
          className={"bar-fill" + (tone === "success" ? " success" : "")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
