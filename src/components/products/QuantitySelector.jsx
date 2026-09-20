import { cn } from '@/utils/cn';

export function QuantitySelector({
  value = 1,
  min = 1,
  max,
  onChange,
  disabled = false,
  className,
  ...props
}) {
  const current = Number(value) || min;
  const atMin = current <= min;
  const atMax = max != null && current >= max;

  const setValue = (next) => {
    let clamped = next;
    if (clamped < min) clamped = min;
    if (max != null && clamped > max) clamped = max;
    onChange?.(clamped);
  };

  return (
    <div
      className={cn('inline-flex items-center rounded-md border border-border', className)}
      {...props}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || atMin}
        onClick={() => setValue(current - 1)}
        className={cn(
          'px-3 py-2 text-sm text-charcoal hover:bg-off-white',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label="Quantity"
        value={current}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isNaN(next)) return;
          setValue(next);
        }}
        className={cn(
          'w-12 border-x border-border bg-surface py-2 text-center text-sm text-charcoal',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
        )}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || atMax}
        onClick={() => setValue(current + 1)}
        className={cn(
          'px-3 py-2 text-sm text-charcoal hover:bg-off-white',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        +
      </button>
    </div>
  );
}
