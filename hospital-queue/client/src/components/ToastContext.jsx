import React, { createContext, useCallback, useContext, useState } from "react";
import { cx } from "./ui";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, tone = "primary") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-[var(--shadow-card-hover)] animate-toast-in bg-[var(--card)] border-[var(--border)] text-[var(--text)]"
          >
            <span
              className={cx("h-2 w-2 rounded-full", {
                primary: "bg-[var(--primary)]",
                success: "bg-[var(--success)]",
                warning: "bg-[var(--warning)]",
                danger: "bg-[var(--danger)]",
                info: "bg-[var(--info)]",
              }[t.tone])}
            />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
