import { cn } from '@/utils/cn';

export function StatCard({ label, value, hint, icon, className, ...props }) {
  return (
    <div className={cn('rounded-md border border-border bg-surface p-4', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-charcoal">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="shrink-0 text-muted" aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
