import { NavLink, Outlet } from "react-router-dom";
import { Icon } from "./components/Icon";
import { ReminderWatcher } from "./components/ReminderWatcher";
import { Onboarding } from "./components/Onboarding";
import { useI18n } from "./i18n";
import "./App.css";

const NAV = [
  { to: "/", key: "nav.today", icon: "home" as const, end: true },
  { to: "/week", key: "nav.week", icon: "week" as const },
  { to: "/goals", key: "nav.goals", icon: "target" as const },
  { to: "/habits", key: "nav.habits", icon: "habit" as const },
  { to: "/focus", key: "nav.focus", icon: "clock" as const },
  { to: "/insights", key: "nav.insights", icon: "chart" as const },
  { to: "/calendar", key: "nav.calendar", icon: "calendar" as const },
  { to: "/search", key: "nav.search", icon: "search" as const },
];

function App() {
  const { t } = useI18n();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="leaf" size={20} />
          </span>
          <h1>{t("brand")}</h1>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                "nav-link" + (isActive ? " active" : "")
              }
            >
              <Icon name={item.icon} />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            "nav-link settings-link" + (isActive ? " active" : "")
          }
        >
          <Icon name="settings" />
          <span>{t("nav.settings")}</span>
        </NavLink>
      </aside>

      <main className="content">
        <Outlet />
      </main>
      <ReminderWatcher />
      <Onboarding />
    </div>
  );
}

export default App;
