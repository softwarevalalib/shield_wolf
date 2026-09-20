import { Badge } from '@/components/common/Badge';
import { cn } from '@/utils/cn';
import { getStatusMeta } from '@/utils/statusLabels';

/**
 * Status chip with icon + text + color (not color alone).
 */
export function StatusBadge({ status, className }) {
  const meta = getStatusMeta(status);

  return (
    <Badge variant={meta.variant} className={cn('gap-1 capitalize', className)}>
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
    </Badge>
  );
}

export { formatStatusLabel } from '@/utils/statusLabels';
