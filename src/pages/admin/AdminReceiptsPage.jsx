import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Pagination } from '@/components/common/Pagination';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

/**
 * Admin receipts list.
 */
export function AdminReceiptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams]
  );

  const listQuery = useQuery({
    queryKey: ['admin', 'receipts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/receipts?${params}`);
      return payload.data;
    },
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || (key === 'page' && Number(value) === 1)) next.delete(key);
    else next.set(key, String(value));
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  if (listQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        title="Unable to load receipts"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const { receipts, pagination } = listQuery.data;

  const columns = [
    {
      key: 'receiptNumber',
      header: 'Receipt',
      render: (value, row) => (
        <Link to={`/admin/receipts/${row.id}`} className="font-medium hover:underline">
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
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (value, row) =>
        value && row.invoiceId ? (
          <Link to={`/admin/invoices/${row.invoiceId}`} className="hover:underline">
            {value}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (value) => value || '—',
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (value) => labelStatus(value) || '—',
    },
    {
      key: 'amountPaid',
      header: 'Paid',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'paidAt',
      header: 'Paid at',
      render: (value) => (value ? new Date(value).toLocaleString() : '—'),
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Receipts</h1>
      <p className="mt-1 text-sm text-muted">
        Confirmed payment records. Distinct from invoices (amounts charged).
      </p>

      <div className="mt-4 max-w-md">
        <Input
          label="Search"
          value={filters.q}
          onChange={(e) => updateFilter('q', e.target.value)}
          placeholder="Receipt #, order #, invoice #…"
        />
      </div>

      <div className="mt-4">
        {receipts?.length ? (
          <Table columns={columns} rows={receipts} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No receipts"
            description="Receipts are created when a payment is approved."
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
