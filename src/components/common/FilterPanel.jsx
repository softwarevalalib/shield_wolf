import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

export function FilterPanel({
  children,
  onApply,
  onReset,
  applyLabel = 'Apply',
  resetLabel = 'Reset',
  className,
  ...props
}) {
  return (
    <div className={cn('rounded-md border border-border bg-surface p-4', className)} {...props}>
      <div className="space-y-3">{children}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={onApply}>
          {applyLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onReset}>
          {resetLabel}
        </Button>
      </div>
    </div>
  );
}
