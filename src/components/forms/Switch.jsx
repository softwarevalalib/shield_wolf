import { useId } from 'react';
import { cn } from '@/utils/cn';

export function Switch({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  id,
  className,
  ...props
}) {
  const generatedId = useId();
  const switchId = id || generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-shield-red' : 'bg-border'
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block size-5 translate-y-px rounded-full bg-surface shadow-soft transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
      {(label || description) && (
        <div className="min-w-0">
          {label ? (
            <label htmlFor={switchId} className="block text-sm font-medium text-charcoal">
              {label}
            </label>
          ) : null}
          {description ? (
            <p id={descriptionId} className="mt-0.5 text-sm text-muted">
              {description}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
