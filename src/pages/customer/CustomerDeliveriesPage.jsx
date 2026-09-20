import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/common/Badge';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/services/apiClient';

function statusBadgeVariant(status) {
  if (status === 'delivered') return 'success';
  if (status === 'out_for_delivery') return 'warning';
  return 'info';
}

/**
 * Customer deliveries view — uses order status until full delivery module (Phase 19).
 */
export function CustomerDeliveriesPage() {
  const overviewQuery = useQuery({
    queryKey: ['account', 'overview'],
    queryFn: async () => {
      const payload = await apiClient.get('/account/overview');
      return payload.data?.overview;
    },
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (overviewQuery.isError) {
    return <ErrorState title="Unable to load deliveries" onRetry={() => overviewQuery.refetch()} />;
  }

  const current = overviewQuery.data?.currentDelivery;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Deliveries</h1>
      <p className="mt-1 text-sm text-muted">
        Track active orders in delivery. Full delivery history expands in a later phase.
      </p>

      <div className="mt-6">
        {current ? (
          <div className="rounded-md border border-border bg-surface p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-charcoal">{current.orderNumber}</span>
              <Badge variant={statusBadgeVariant(current.status)}>
                {current.status.replaceAll('_', ' ')}
              </Badge>
            </div>
            {current.delivery ? (
              <p className="mt-2 text-muted">
                {[current.delivery.community, current.delivery.city, current.delivery.county]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                to={`/track-order?order=${encodeURIComponent(current.orderNumber)}`}
                className="inline-flex rounded-md bg-charcoal px-3 py-1.5 text-sm font-medium text-white"
              >
                Track delivery
              </Link>
              <Link
                to={`/account/orders/${encodeURIComponent(current.orderNumber)}`}
                className="text-sm underline hover:text-charcoal"
              >
                View order
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No active deliveries"
            description="When an order is out for delivery, it will appear here."
            action={
              <Link
                to="/track-order"
                className="inline-flex rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
              >
                Track an order
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
