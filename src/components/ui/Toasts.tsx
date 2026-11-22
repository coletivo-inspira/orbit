"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ToastType = "info" | "success";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toasts: [], showToast: () => {} });

const VISIBLE_MS = 2700;
const EXIT_MS = 320;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, type, visible: false }]);
    timers.current.push(
      window.setTimeout(() => setToasts((l) => l.map((t) => (t.id === id ? { ...t, visible: true } : t))), 16),
      window.setTimeout(() => setToasts((l) => l.map((t) => (t.id === id ? { ...t, visible: false } : t))), VISIBLE_MS),
      window.setTimeout(() => setToasts((l) => l.filter((t) => t.id !== id)), VISIBLE_MS + EXIT_MS),
    );
  }, []);

  const value = useMemo(() => ({ toasts, showToast }), [toasts, showToast]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  return useContext(ToastContext).showToast;
}

export function ToastViewport({ className, compact = false }: { className: string; compact?: boolean }) {
  const { toasts } = useContext(ToastContext);
  return (
    <div className={`pointer-events-none z-50 flex flex-col gap-2 ${className}`} aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`${compact ? "max-w-[230px] px-3 py-1.5 text-[10px]" : "max-w-[300px] px-4 py-2.5 text-xs"} pointer-events-auto rounded-2xl border text-center font-medium shadow-[0_14px_34px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl transition-all duration-300 ${
            t.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          } ${t.type === "success" ? "border-emerald-300/40 bg-emerald-950/80 text-emerald-50" : "border-white/25 bg-slate-900/80 text-white"}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
