import { useId } from 'react';
import { cn } from '@/utils/cn';

export function SearchInput({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search…',
  disabled = false,
  fullWidth = true,
  id,
  className,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasValue = String(value).length > 0;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChange?.({ target: { value: '' } });
  };

  return (
    <div className={cn('relative', fullWidth && 'w-full', className)}>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted"
        aria-hidden="true"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id={inputId}
        type="search"
        role="searchbox"
        aria-label="Search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'block rounded-md border border-border bg-surface py-2 pl-9 text-sm text-charcoal placeholder:text-muted',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50',
          fullWidth && 'w-full',
          hasValue ? 'pr-9' : 'pr-3'
        )}
        {...props}
      />
      {hasValue && !disabled ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            'absolute inset-y-0 right-0 flex items-center px-2.5 text-muted hover:text-charcoal',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red rounded-md'
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
