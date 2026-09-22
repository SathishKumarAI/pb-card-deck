"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Check } from "lucide-react";

// Lightweight app-wide toast/snackbar system (backlog F218). Optional action
// powers undo toasts for destructive actions (F219). Mounted once via
// ToastProvider in the root layout; call useToast() anywhere below it.

type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; action?: ToastAction };

const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message: string, action?: ToastAction) => {
    const id = (idRef.current += 1);
    setToasts((t) => [...t, { id, message, action }]);
    // Linger longer when there's an action to click.
    const ttl = action ? 6000 : 3200;
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2 px-3 w-full max-w-sm pointer-events-none"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className="anim-pop glass pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full text-sm shadow-2xl"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <Check size={15} style={{ color: "var(--accent)" }} aria-hidden />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="font-semibold"
                style={{ color: "var(--accent)" }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
