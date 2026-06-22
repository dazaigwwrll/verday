/* ============================================================
   Search — find tasks and goals by text (title / notes / tags),
   with quick tag filters. Tasks link to their day, goals to the
   goals page. Pure client-side over the local store (offline).
   ============================================================ */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../domain/store";
import { Icon } from "../components/Icon";
import { useI18n } from "../i18n";
import { formatJalaliLong, relativeDayLabel } from "../lib/date";
import type { GoalScope } from "../domain/types";

const SCOPE_ICON: Record<GoalScope, "flag" | "month" | "week" | "day"> = {
  year: "flag",
  month: "month",
  week: "week",
  day: "day",
};

export default function Search() {
  const { state } = useStore();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const q = query.trim().toLowerCase();
  const allTags = Array.from(
    new Set(state.tasks.flatMap((x) => x.tags ?? []))
  ).sort();

  const toggleTag = (tg: string) =>
    setActiveTags((a) =>
      a.includes(tg) ? a.filter((x) => x !== tg) : [...a, tg]
    );

  const active = q.length > 0 || activeTags.length > 0;

  const taskResults = !active
    ? []
    : state.tasks
        .filter((task) => {
          if (!activeTags.every((tg) => (task.tags ?? []).includes(tg)))
            return false;
          if (!q) return true;
          const hay = `${task.title} ${task.notes ?? ""} ${(task.tags ?? []).join(
            " "
          )}`.toLowerCase();
          return hay.includes(q);
        })
        .sort((a, b) => b.date.localeCompare(a.date));

  const goalResults =
    q.length > 0
      ? state.goals.filter((g) =>
          `${g.title} ${g.notes ?? ""}`.toLowerCase().includes(q)
        )
      : [];

  return (
    <>
      <header className="page-header">
        <h2>
          <Icon name="search" size={22} /> {t("search.title")}
        </h2>
      </header>

      <div className="search-bar">
        <Icon name="search" size={18} />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => setQuery("")}
            aria-label={t("common.cancel")}
          >
            <Icon name="plus" size={16} className="rot45" />
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="search-tags">
          {allTags.map((tg) => (
            <button
              key={tg}
              className={"tag-chip toggle" + (activeTags.includes(tg) ? " on" : "")}
              onClick={() => toggleTag(tg)}
            >
              <Icon name="tag" size={11} />
              {tg}
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <div className="empty">
          <Icon name="search" size={22} />
          <span>{t("search.prompt")}</span>
        </div>
      ) : taskResults.length === 0 && goalResults.length === 0 ? (
        <div className="empty">
          <Icon name="sparkle" size={22} />
          <span>{t("search.empty")}</span>
        </div>
      ) : (
        <>
          {taskResults.length > 0 && (
            <section className="search-group">
              <h3 className="search-group-title">
                <Icon name="check" size={16} /> {t("search.tasks")} ·{" "}
                {taskResults.length}
              </h3>
              <div className="list">
                {taskResults.map((task) => (
                  <Link
                    key={task.id}
                    to={`/?d=${task.date}`}
                    className={"item search-item" + (task.done ? " done" : "")}
                  >
                    <div className="item-main">
                      <span className="item-title">{task.title}</span>
                      <span className="item-metas">
                        <span className="item-meta">
                          {relativeDayLabel(task.date)} · {formatJalaliLong(task.date)}
                        </span>
                        {(task.tags ?? []).map((tg) => (
                          <span key={tg} className="tag-chip">
                            <Icon name="tag" size={10} />
                            {tg}
                          </span>
                        ))}
                      </span>
                    </div>
                    <Icon name="chevron" size={16} className="arrow-next" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {goalResults.length > 0 && (
            <section className="search-group">
              <h3 className="search-group-title">
                <Icon name="target" size={16} /> {t("search.goals")} ·{" "}
                {goalResults.length}
              </h3>
              <div className="list">
                {goalResults.map((g) => (
                  <Link
                    key={g.id}
                    to="/goals"
                    className={"item search-item" + (g.done ? " done" : "")}
                  >
                    <div className="item-main">
                      <span className="item-title">{g.title}</span>
                    </div>
                    <Icon name={SCOPE_ICON[g.scope]} size={16} className="subtle" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
