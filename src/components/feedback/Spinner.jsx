import { cn } from '@/utils/cn';

/**
 * Inline loading foundation for section-level states.
 */
export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div
      className={cn('inline-flex items-center gap-2 text-sm text-muted', className)}
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block size-4 animate-spin rounded-full border-2 border-border border-t-shield-red"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}

export default Spinner;
