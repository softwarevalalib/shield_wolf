import { cn } from '@/utils/cn';

export function Pagination({ page = 1, pageCount = 1, onPageChange, className, ...props }) {
  const safePageCount = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), safePageCount);
  const canPrev = current > 1;
  const canNext = current < safePageCount;

  const go = (next) => {
    if (next < 1 || next > safePageCount) return;
    onPageChange?.(next);
  };

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-2', className)}
      {...props}
    >
      <button
        type="button"
        onClick={() => go(current - 1)}
        disabled={!canPrev}
        aria-label="Previous page"
        className={cn(
          'rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-charcoal',
          'hover:bg-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        Previous
      </button>
      <span className="px-2 text-sm text-muted" aria-live="polite">
        Page <span className="font-medium text-charcoal">{current}</span> of {safePageCount}
      </span>
      <button
        type="button"
        onClick={() => go(current + 1)}
        disabled={!canNext}
        aria-label="Next page"
        className={cn(
          'rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-charcoal',
          'hover:bg-off-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        Next
      </button>
    </nav>
  );
}
