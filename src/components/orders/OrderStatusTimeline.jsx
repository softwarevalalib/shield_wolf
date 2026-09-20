import { cn } from '@/utils/cn';

/**
 * Visual order status timeline for customers.
 * Uses text labels + state (not color alone) for accessibility.
 */
export function OrderStatusTimeline({ timeline, className }) {
  if (!timeline?.steps?.length) return null;

  const { steps, terminalStatus } = timeline;

  return (
    <div className={cn('space-y-4', className)}>
      {terminalStatus ? (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          This order is <span className="font-medium capitalize">{terminalStatus}</span>.
        </p>
      ) : null}

      <ol className="relative space-y-0" aria-label="Order progress">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const isComplete = step.state === 'complete';
          const isCurrent = step.state === 'current';

          return (
            <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  className={cn(
                    'absolute left-[11px] top-6 h-[calc(100%-8px)] w-px',
                    isComplete ? 'bg-success' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                  isComplete && 'border-success bg-success text-white',
                  isCurrent && 'border-charcoal bg-charcoal text-white',
                  step.state === 'upcoming' && 'border-border bg-surface text-muted'
                )}
                aria-hidden="true"
              >
                {isComplete ? '✓' : index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCurrent || isComplete ? 'text-charcoal' : 'text-muted'
                  )}
                >
                  {step.label}
                  {isCurrent ? (
                    <span className="sr-only"> (current)</span>
                  ) : isComplete ? (
                    <span className="sr-only"> (complete)</span>
                  ) : (
                    <span className="sr-only"> (upcoming)</span>
                  )}
                </p>
                {step.reachedAt ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(step.reachedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
