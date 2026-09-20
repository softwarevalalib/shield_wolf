import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { cn } from '@/utils/cn';

export function ChartCard({
  title,
  description,
  children,
  loading = false,
  error = null,
  empty = false,
  emptyTitle = 'No chart data',
  emptyDescription = 'There is nothing to display yet.',
  onRetry,
  className,
  ...props
}) {
  return (
    <section className={cn('rounded-md border border-border bg-surface p-4', className)} {...props}>
      <header className="mb-4">
        {title ? <h3 className="text-sm font-medium text-charcoal">{title}</h3> : null}
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </header>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Spinner label="Loading chart…" />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to load chart"
          description={typeof error === 'string' ? error : undefined}
          onRetry={onRetry}
        />
      ) : empty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="min-h-48">{children}</div>
      )}
    </section>
  );
}
