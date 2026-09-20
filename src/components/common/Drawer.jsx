import { useEffect, useId, useRef } from 'react';
import { cn } from '@/utils/cn';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Drawer({ open, onClose, title, children, side = 'right', className, ...props }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = panel ? Array.from(panel.querySelectorAll(FOCUSABLE)) : [];
    focusables[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-charcoal/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-sm flex-col border-border bg-surface shadow-soft',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          {title ? (
            <h2 id={titleId} className="text-base font-medium text-charcoal">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              'rounded-md p-1 text-muted hover:text-charcoal',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red'
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm text-charcoal">{children}</div>
      </div>
    </div>
  );
}
