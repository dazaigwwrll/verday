import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@fontsource-variable/vazirmatn";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./theme.tsx";
import { I18nProvider } from "./i18n.tsx";
import { PrefsProvider } from "./prefs.tsx";
import { FocusProvider } from "./focus.tsx";
import { ConfirmProvider } from "./components/Confirm.tsx";
import { StoreProvider } from "./domain/store.tsx";
import { SyncProvider } from "./sync.tsx";
import Today from "./pages/Today.tsx";
import Week from "./pages/Week.tsx";
import Goals from "./pages/Goals.tsx";
import Habits from "./pages/Habits.tsx";
import Insights from "./pages/Insights.tsx";
import Review from "./pages/Review.tsx";
import Focus from "./pages/Focus.tsx";
import Calendar from "./pages/Calendar.tsx";
import Search from "./pages/Search.tsx";
import Settings from "./pages/Settings.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Today /> },
      { path: "week", element: <Week /> },
      { path: "goals", element: <Goals /> },
      { path: "habits", element: <Habits /> },
      { path: "insights", element: <Insights /> },
      { path: "review", element: <Review /> },
      { path: "focus", element: <Focus /> },
      { path: "calendar", element: <Calendar /> },
      { path: "search", element: <Search /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <PrefsProvider>
          <FocusProvider>
            <ConfirmProvider>
              <StoreProvider>
                <SyncProvider>
                  <RouterProvider router={router} />
                </SyncProvider>
              </StoreProvider>
            </ConfirmProvider>
          </FocusProvider>
        </PrefsProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
);
