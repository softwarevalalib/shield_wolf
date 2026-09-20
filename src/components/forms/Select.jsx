import { useId } from 'react';
import { cn } from '@/utils/cn';

const fieldClasses =
  'block rounded-md border border-border bg-surface px-3 py-2 text-sm text-charcoal transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red disabled:cursor-not-allowed disabled:opacity-50';

export function Select({
  label,
  hint,
  error,
  options = [],
  required = false,
  disabled = false,
  fullWidth = true,
  id,
  placeholder,
  className,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn(fullWidth && 'w-full', className)}>
      {label ? (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-charcoal">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <select
        id={selectId}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={cn(fieldClasses, fullWidth && 'w-full', error && 'border-danger')}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={String(option.value)} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
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
