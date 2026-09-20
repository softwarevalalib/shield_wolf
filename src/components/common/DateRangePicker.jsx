import { useId } from 'react';
import { cn } from '@/utils/cn';

const fieldClasses =
  'block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red disabled:cursor-not-allowed disabled:opacity-50';

export function DateRangePicker({
  startDate = '',
  endDate = '',
  onChange,
  startLabel = 'Start date',
  endLabel = 'End date',
  disabled = false,
  className,
  ...props
}) {
  const baseId = useId();
  const startId = `${baseId}-start`;
  const endId = `${baseId}-end`;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)} {...props}>
      <div>
        <label htmlFor={startId} className="mb-1.5 block text-sm font-medium text-charcoal">
          {startLabel}
        </label>
        <input
          id={startId}
          type="date"
          value={startDate}
          disabled={disabled}
          max={endDate || undefined}
          onChange={(event) => onChange?.({ startDate: event.target.value, endDate })}
          className={fieldClasses}
        />
      </div>
      <div>
        <label htmlFor={endId} className="mb-1.5 block text-sm font-medium text-charcoal">
          {endLabel}
        </label>
        <input
          id={endId}
          type="date"
          value={endDate}
          disabled={disabled}
          min={startDate || undefined}
          onChange={(event) => onChange?.({ startDate, endDate: event.target.value })}
          className={fieldClasses}
        />
      </div>
    </div>
  );
}
