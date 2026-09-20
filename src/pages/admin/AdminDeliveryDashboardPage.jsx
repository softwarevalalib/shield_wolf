import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasAnyPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

function statusVariant(status) {
  if (status === 'delivered') return 'success';
  if (status === 'failed' || status === 'cancelled' || status === 'returned') return 'danger';
  if (status === 'out_for_delivery' || status === 'attempted' || status === 'assigned') {
    return 'warning';
  }
  return 'neutral';
}

/**
 * Admin delivery dashboard — KPIs, eligible orders, recent deliveries.
 */
export function AdminDeliveryDashboardPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canAssign = hasAnyPermission(user, ['delivery.assign', 'delivery.update']);

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'deliveries', 'dashboard'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/deliveries?view=dashboard');
      return payload.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (orderId) => apiClient.post('/admin/deliveries', { orderId }),
    onSuccess: (payload) => {
      notify.success('Delivery created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'deliveries'] });
      const id = payload?.data?.delivery?.id;
      if (id) navigate(`/admin/deliveries/${id}`);
    },
    onError: (error) => notify.error(error.message || 'Could not create delivery'),
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        title="Unable to load delivery dashboard"
        description={dashboardQuery.error.message}
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  const { summary, recentDeliveries, eligibleOrders } = dashboardQuery.data;

  const recentColumns = [
    {
      key: 'deliveryNumber',
      header: 'Delivery',
      render: (value, row) => (
        <Link to={`/admin/deliveries/${row.id}`} className="font-medium hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'orderNumber',
      header: 'Order',
      render: (value, row) => (
        <Link to={`/admin/orders/${row.orderId}`} className="hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (value, row) => (
        <div>
          <p>{value}</p>
          <p className="text-xs text-muted">{row.community || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={statusVariant(value)}>{labelStatus(value)}</Badge>,
    },
    {
      key: 'driverName',
      header: 'Driver',
      render: (value) => value || '—',
    },
  ];

  const eligibleColumns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (value, row) => (
        <Link to={`/admin/orders/${row.id}`} className="font-medium hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (value, row) => (
        <div>
          <p>{value}</p>
          <p className="text-xs text-muted">{row.phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'community',
      header: 'Area',
      render: (value, row) => value || row.zoneName || '—',
    },
    {
      key: 'status',
      header: 'Order status',
      render: (value) => <Badge variant="neutral">{labelStatus(value)}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (_value, row) =>
        canAssign ? (
          <Button
            size="sm"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate(row.id)}
          >
            Create delivery
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Delivery</h1>
          <p className="mt-1 text-sm text-muted">
            Dispatch paid and packed orders. Assign drivers and track status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/deliveries/dispatch"
            className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-off-white"
          >
            Dispatch board
          </Link>
          <Link
            to="/admin/deliveries/all"
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium hover:bg-off-white"
          >
            All deliveries
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Awaiting dispatch" value={summary.awaitingDispatch} />
        <StatCard label="Assigned" value={summary.assigned} />
        <StatCard label="Out for delivery" value={summary.outForDelivery} />
        <StatCard label="Delivered today" value={summary.deliveredToday} />
        <StatCard label="Delayed" value={summary.delayed} hint="Past expected time" />
        <StatCard label="Failed" value={summary.failed} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-charcoal">Ready to dispatch</h2>
        <p className="mt-1 text-sm text-muted">
          Paid / processing / packed orders without an active delivery.
        </p>
        <div className="mt-3">
          {eligibleOrders?.length ? (
            <Table columns={eligibleColumns} rows={eligibleOrders} getRowKey={(row) => row.id} />
          ) : (
            <EmptyState
              title="No eligible orders"
              description="Orders appear here after payment is verified and before a delivery is created."
            />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-charcoal">Recent deliveries</h2>
        <div className="mt-3">
          {recentDeliveries?.length ? (
            <Table columns={recentColumns} rows={recentDeliveries} getRowKey={(row) => row.id} />
          ) : (
            <EmptyState
              title="No deliveries yet"
              description="Create a delivery from an eligible order above."
            />
          )}
        </div>
      </section>
    </div>
  );
}
