/* ============================================================
   Priority indicator — 3 ascending bars (signal style), stays
   monochrome. 1 bar = low, 2 = med, 3 = high.
   ============================================================ */

import { PRIORITY_WEIGHT, type TaskPriority } from "../domain/types";

export function PriorityMark({ priority }: { priority: TaskPriority }) {
  const level = PRIORITY_WEIGHT[priority]; // 1..3
  return (
    <span className={"prio prio-" + priority} aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={"prio-bar" + (n <= level ? " on" : "")} />
      ))}
    </span>
  );
}
