import { cn } from '@/utils/cn';

/**
 * Subtle container for interactive surfaces. Prefer no chrome when not needed.
 */
export function Card({ title, children, className, interactive = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-md',
        interactive
          ? 'border border-border bg-surface'
          : 'border border-transparent bg-transparent',
        className
      )}
      {...props}
    >
      {title ? (
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-charcoal">{title}</h3>
        </div>
      ) : null}
      <div className={cn(title ? 'p-4' : interactive ? 'p-4' : undefined)}>{children}</div>
    </div>
  );
}
