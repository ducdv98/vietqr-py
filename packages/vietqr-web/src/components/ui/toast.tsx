"use client";

import * as React from "react";

type Ctx = { toast: (message: string) => void };
const ToastContext = React.createContext<Ctx>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = React.useCallback((m: string) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3000);
  }, []);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-60 flex justify-center px-4"
      >
        {message && (
          <div className="rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-pop">
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
