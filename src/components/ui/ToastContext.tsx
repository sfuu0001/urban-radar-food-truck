import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, type = 'info', duration = 3000 }: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { id, title, description, type, duration };

      // Defer state update so calling toast inside or during any render lifecycle never clashes
      setTimeout(() => {
        setToasts((prev) => [...prev.slice(-3), newToast]);
      }, 0);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string) => showToast({ title, description, type: 'success' }),
    [showToast]
  );

  const error = useCallback(
    (title: string, description?: string) => showToast({ title, description, type: 'error' }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => showToast({ title, description, type: 'warning' }),
    [showToast]
  );

  const info = useCallback(
    (title: string, description?: string) => showToast({ title, description, type: 'info' }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        id="global-toast-container"
        className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4 select-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`pointer-events-auto w-full rounded-xl p-3 shadow-lg border backdrop-blur-md flex items-start gap-2.5 transition-all ${
                t.type === 'success'
                  ? 'bg-neutral-900/95 text-white border-neutral-700/80'
                  : t.type === 'error'
                  ? 'bg-rose-950/95 text-rose-100 border-rose-800/80'
                  : t.type === 'warning'
                  ? 'bg-amber-950/95 text-amber-100 border-amber-800/80'
                  : 'bg-neutral-900/95 text-white border-neutral-700/80'
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {t.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
                {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {t.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-bold leading-tight">{t.title}</h4>
                {t.description && (
                  <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
                    {t.description}
                  </p>
                )}
              </div>

              {/* Dismiss */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-white/50 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
