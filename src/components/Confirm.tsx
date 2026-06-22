/* ============================================================
   In-app confirm — a small on-screen message instead of the
   browser's native dialog. useConfirm() returns ask(message)
   which resolves true/false.
   ============================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "../i18n";

type Ask = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<Ask>(() => Promise.resolve(false));

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ask = useCallback<Ask>(
    (m) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setMessage(m);
      }),
    []
  );

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setMessage(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {message !== null && (
        <div className="confirm-overlay" onClick={() => close(false)}>
          <div
            className="confirm-box"
            role="alertdialog"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="confirm-msg">{message}</p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => close(false)}>
                {t("common.cancel")}
              </button>
              <button className="btn btn-danger" onClick={() => close(true)}>
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): Ask {
  return useContext(ConfirmContext);
}
