import { useId } from 'react';
import { cn } from '@/utils/cn';

const fieldClasses =
  'block rounded-md border border-border bg-surface px-3 py-2 text-sm text-charcoal placeholder:text-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red disabled:cursor-not-allowed disabled:opacity-50';

export function Input({
  label,
  hint,
  error,
  required = false,
  disabled = false,
  fullWidth = true,
  id,
  className,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn(fullWidth && 'w-full', className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-charcoal">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <input
        id={inputId}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={cn(fieldClasses, fullWidth && 'w-full', error && 'border-danger')}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
