import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const NotificationContext = createContext(null);

let toastSeq = 0;

/**
 * Toast / notification system foundation.
 * Channel abstraction for in-app (and later email/SMS/WhatsApp) is server-side.
 */
export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, tone = 'info', durationMs = 5000 }) => {
      const id = `toast-${Date.now()}-${toastSeq++}`;
      setToasts((current) => [...current, { id, title, message, tone }]);

      if (durationMs > 0) {
        window.setTimeout(() => dismissToast(id), durationMs);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      notify,
      dismissToast,
      success: (message, options = {}) => notify({ message, tone: 'success', ...options }),
      error: (message, options = {}) => notify({ message, tone: 'error', ...options }),
      warning: (message, options = {}) => notify({ message, tone: 'warning', ...options }),
      info: (message, options = {}) => notify({ message, tone: 'info', ...options }),
    }),
    [toasts, notify, dismissToast]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
