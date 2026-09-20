import { useNotification } from '@/contexts/NotificationContext';

const toneStyles = {
  success: 'border-success/30 bg-white text-success',
  error: 'border-danger/30 bg-white text-danger',
  warning: 'border-warning/30 bg-white text-warning',
  info: 'border-info/30 bg-white text-info',
};

/**
 * Toast / notification viewport foundation.
 */
export function ToastViewport() {
  const { toasts, dismissToast } = useNotification();

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-2 p-4 sm:bottom-auto sm:top-0"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border px-3 py-2 shadow-soft ${
            toneStyles[toast.tone] || toneStyles.info
          }`}
        >
          <div className="flex-1 text-sm text-charcoal">
            {toast.title ? <p className="font-medium">{toast.title}</p> : null}
            <p className={toast.title ? 'text-muted' : ''}>{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-xs text-muted hover:text-charcoal"
            aria-label="Dismiss notification"
          >
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
