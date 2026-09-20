import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatStatusLabel } from '@/utils/statusLabels';
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
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'awaiting_payment', label: 'Awaiting payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'packed', label: 'Packed' },
  { value: 'ready_for_dispatch', label: 'Ready for dispatch' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

/**
 * Admin orders list — search, status filter, pagination.
 */
export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      status: searchParams.get('status') || 'all',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams]
  );

  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/orders?${params}`);
      return payload.data;
    },
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || (key === 'page' && Number(value) === 1)) {
      if (key === 'page') next.delete('page');
      else next.delete(key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  if (ordersQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <ErrorState
        title="Unable to load orders"
        description={ordersQuery.error.message}
        onRetry={() => ordersQuery.refetch()}
      />
    );
  }

  const { orders, pagination, statusCounts } = ordersQuery.data;

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (value, row) => (
        <div>
          <Link to={`/admin/orders/${row.id}`} className="font-medium hover:underline">
            {value}
          </Link>
          <p className="text-xs text-muted">{new Date(row.createdAt).toLocaleString()}</p>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (value, row) => (
        <div>
          <p>{value}</p>
          <p className="text-xs text-muted">{row.phone || row.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (value, row) =>
        value ? (
          <span className="text-sm">
            {formatStatusLabel(value)}
            {row.paymentMethod ? (
              <span className="block text-xs text-muted">{row.paymentMethod}</span>
            ) : null}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'itemCount',
      header: 'Items',
    },
    {
      key: 'total',
      header: 'Total',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'actions',
      header: '',
      render: (_value, row) => (
        <Link to={`/admin/orders/${row.id}`} className="text-sm text-shield-red hover:underline">
          View
        </Link>
      ),
    },
  ];

  const countChips = Object.entries(statusCounts || {})
    .filter(([, count]) => count > 0)
    .slice(0, 8);

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal">Orders</h1>
        <p className="mt-1 text-sm text-muted">
          Manage order lifecycle. Payment verification and delivery dispatch arrive in later phases.
        </p>
      </div>

      {countChips.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {countChips.map(([status, count]) => (
            <button
              key={status}
              type="button"
              onClick={() => updateFilter('status', status)}
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-charcoal hover:border-charcoal"
            >
              {formatStatusLabel(status)} <span className="text-muted">({count})</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Input
          label="Search"
          value={filters.q}
          onChange={(event) => updateFilter('q', event.target.value)}
          placeholder="Order #, phone, email"
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface">
        {orders.length === 0 ? (
          <EmptyState title="No orders" description="Orders appear here after checkout." />
        ) : (
          <Table columns={columns} rows={orders} getRowKey={(row) => row.id} />
        )}
      </div>

      {pagination.pageCount > 1 ? (
        <Pagination
          className="mt-4"
          page={pagination.page}
          pageCount={pagination.pageCount}
          onPageChange={(page) => updateFilter('page', page)}
        />
      ) : null}
    </div>
  );
}
