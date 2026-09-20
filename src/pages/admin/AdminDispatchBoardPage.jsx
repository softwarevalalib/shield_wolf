import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Badge } from '@/components/common/Badge';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';

const BOARD_COLUMNS = [
  { key: 'pending', label: 'Pending' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'picked_up', label: 'Picked up' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'attempted', label: 'Attempted' },
];

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

/**
 * Kanban-style dispatch board for active deliveries.
 */
export function AdminDispatchBoardPage() {
  const boardQuery = useQuery({
    queryKey: ['admin', 'deliveries', 'dispatch'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/deliveries?view=dispatch');
      return payload.data;
    },
    refetchInterval: 30_000,
  });

  if (boardQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <ErrorState
        title="Unable to load dispatch board"
        description={boardQuery.error.message}
        onRetry={() => boardQuery.refetch()}
      />
    );
  }

  const columns = boardQuery.data?.columns || {};
  const total = BOARD_COLUMNS.reduce((sum, col) => sum + (columns[col.key]?.length || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Dispatch board</h1>
          <p className="mt-1 text-sm text-muted">
            <Link to="/admin/deliveries" className="hover:underline">
              Dashboard
            </Link>
            <span aria-hidden="true"> · </span>
            {total} active {total === 1 ? 'delivery' : 'deliveries'}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Board is empty"
            description="Create deliveries from eligible orders on the dashboard."
          />
        </div>
      ) : (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => {
            const items = columns[col.key] || [];
            return (
              <section
                key={col.key}
                className="w-64 shrink-0 rounded-md border border-border bg-off-white/60"
              >
                <header className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h2 className="text-sm font-semibold text-charcoal">{col.label}</h2>
                  <Badge variant="neutral">{items.length}</Badge>
                </header>
                <ul className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                  {items.map((delivery) => (
                    <li key={delivery.id}>
                      <Link
                        to={`/admin/deliveries/${delivery.id}`}
                        className="block rounded-md border border-border bg-surface p-3 hover:border-charcoal/30"
                      >
                        <p className="font-medium text-charcoal">{delivery.deliveryNumber}</p>
                        <p className="mt-0.5 text-xs text-muted">{delivery.orderNumber}</p>
                        <p className="mt-2 text-sm">{delivery.customerName}</p>
                        <p className="text-xs text-muted">
                          {delivery.community || delivery.zoneName || '—'}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {delivery.driverName ? `Driver: ${delivery.driverName}` : 'Unassigned'}
                        </p>
                        {delivery.expectedAt ? (
                          <p className="mt-1 text-xs text-muted">
                            ETA {new Date(delivery.expectedAt).toLocaleString()}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                  {items.length === 0 ? (
                    <li className="px-2 py-6 text-center text-xs text-muted">None</li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-muted">
        Statuses shown: {labelStatus('pending')} → attempted.
      </p>
    </div>
  );
}
