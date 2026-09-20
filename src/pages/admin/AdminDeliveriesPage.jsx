import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'picked_up', label: 'Picked up' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
];

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
 * Admin all-deliveries list with filters.
 */
export function AdminDeliveriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      status: searchParams.get('status') || 'all',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams]
  );

  const listQuery = useQuery({
    queryKey: ['admin', 'deliveries', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('status', filters.status);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/deliveries?${params}`);
      return payload.data;
    },
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (
      !value ||
      (key === 'status' && value === 'all') ||
      (key === 'page' && Number(value) === 1)
    ) {
      next.delete(key === 'page' ? 'page' : key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  if (listQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        title="Unable to load deliveries"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const { deliveries, pagination } = listQuery.data;

  const columns = [
    {
      key: 'deliveryNumber',
      header: 'Delivery',
      render: (value, row) => (
        <div>
          <Link to={`/admin/deliveries/${row.id}`} className="font-medium hover:underline">
            {value}
          </Link>
          <p className="text-xs text-muted">
            {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}
          </p>
        </div>
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
          <p className="text-xs text-muted">{row.customerPhone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'community',
      header: 'Area',
      render: (value, row) => value || row.zoneName || '—',
    },
    {
      key: 'driverName',
      header: 'Driver',
      render: (value) => value || 'Unassigned',
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={statusVariant(value)}>{labelStatus(value)}</Badge>,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">All deliveries</h1>
          <p className="mt-1 text-sm text-muted">
            <Link to="/admin/deliveries" className="hover:underline">
              Dashboard
            </Link>
            <span aria-hidden="true"> · </span>
            Search and filter delivery records.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Delivery #, order #, customer…"
          />
        </div>
        <div className="w-48">
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      <div className="mt-4">
        {deliveries?.length ? (
          <Table columns={columns} rows={deliveries} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No deliveries"
            description="Adjust filters or create from the dashboard."
          />
        )}
      </div>

      {pagination?.pageCount > 1 ? (
        <div className="mt-4">
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={(page) => updateFilter('page', page)}
          />
        </div>
      ) : null}
    </div>
  );
}
