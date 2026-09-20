import { cn } from '@/utils/cn';

const tones = {
  success: 'border-success/20 bg-success/5 text-success',
  error: 'border-danger/20 bg-danger/5 text-danger',
  warning: 'border-warning/20 bg-warning/5 text-warning',
  info: 'border-info/20 bg-info/5 text-info',
};

export function Alert({ tone = 'info', title, children, onDismiss, className, ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-md border px-4 py-3 text-sm',
        tones[tone] || tones.info,
        className
      )}
      {...props}
    >
      <div className={cn(onDismiss && 'pr-8')}>
        {title ? <p className="mb-1 font-medium text-charcoal">{title}</p> : null}
        {children ? <div className="text-charcoal/90">{children}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            'absolute right-2 top-2 rounded-md p-1 text-muted hover:text-charcoal',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red'
          )}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
