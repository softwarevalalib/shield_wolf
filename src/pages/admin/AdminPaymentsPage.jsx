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

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

function statusVariant(status) {
  if (status === 'paid') return 'success';
  if (status === 'rejected' || status === 'failed' || status === 'cancelled') return 'danger';
  if (status === 'pending_verification' || status === 'pending') return 'warning';
  return 'neutral';
}

/**
 * Admin payments queue — prioritize pending verification.
 */
export function AdminPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      status: searchParams.get('status') || 'pending_verification',
      method: searchParams.get('method') || 'all',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams]
  );

  const paymentsQuery = useQuery({
    queryKey: ['admin', 'payments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('status', filters.status);
      if (filters.method) params.set('method', filters.method);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/payments?${params}`);
      return payload.data;
    },
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || (key === 'page' && Number(value) === 1)) {
      if (key === 'page') next.delete('page');
      else if (key === 'status' && value === 'pending_verification') next.delete('status');
      else next.delete(key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  if (paymentsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (paymentsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load payments"
        description={paymentsQuery.error.message}
        onRetry={() => paymentsQuery.refetch()}
      />
    );
  }

  const { payments, pagination, statusCounts } = paymentsQuery.data;

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (value, row) => (
        <div>
          <Link to={`/admin/payments/${row.id}`} className="font-medium hover:underline">
            {value}
          </Link>
          <p className="text-xs text-muted">
            {new Date(row.updatedAt || row.createdAt).toLocaleString()}
          </p>
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
      key: 'method',
      header: 'Method',
      render: (value) => labelStatus(value),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (value) => value || '—',
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={statusVariant(value)}>{labelStatus(value)}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (_value, row) => (
        <Link to={`/admin/payments/${row.id}`} className="text-sm text-shield-red hover:underline">
          Review
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal">Payments</h1>
        <p className="mt-1 text-sm text-muted">
          Verify Mobile Money submissions. Never collect PINs or OTPs.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(statusCounts || {}).map(([status, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => updateFilter('status', status)}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-charcoal hover:border-charcoal"
          >
            {labelStatus(status)} <span className="text-muted">({count})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => updateFilter('status', 'all')}
          className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-charcoal hover:border-charcoal"
        >
          All
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Input
          label="Search"
          value={filters.q}
          onChange={(event) => updateFilter('q', event.target.value)}
          placeholder="Order #, reference, phone"
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
          options={[
            { value: 'pending_verification', label: 'Pending verification' },
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'all', label: 'All statuses' },
          ]}
        />
        <Select
          label="Method"
          value={filters.method}
          onChange={(event) => updateFilter('method', event.target.value)}
          options={[
            { value: 'all', label: 'All methods' },
            { value: 'mtn_momo', label: 'MTN MoMo' },
            { value: 'orange_money', label: 'Orange Money' },
            { value: 'cod', label: 'Cash on Delivery' },
          ]}
        />
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface">
        {payments.length === 0 ? (
          <EmptyState
            title="No payments in this view"
            description="Customer MoMo submissions appear here for review."
          />
        ) : (
          <Table columns={columns} rows={payments} getRowKey={(row) => row.id} />
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
