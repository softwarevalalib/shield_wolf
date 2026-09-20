import { useId } from 'react';
import { cn } from '@/utils/cn';

export function Checkbox({ label, description, error, disabled = false, id, className, ...props }) {
  const generatedId = useId();
  const checkboxId = id || generatedId;
  const descriptionId = description ? `${checkboxId}-description` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;
  const describedBy = [errorId, descriptionId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn(className)}>
      <div className="flex gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'mt-0.5 size-4 shrink-0 rounded border-border text-shield-red accent-shield-red',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          {...props}
        />
        <div className="min-w-0">
          {label ? (
            <label htmlFor={checkboxId} className="block text-sm font-medium text-charcoal">
              {label}
            </label>
          ) : null}
          {description ? (
            <p id={descriptionId} className="mt-0.5 text-sm text-muted">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
