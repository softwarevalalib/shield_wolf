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

/**
 * Admin invoices list.
 */
export function AdminInvoicesPage() {
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
    queryKey: ['admin', 'invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('status', filters.status);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/invoices?${params}`);
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
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        title="Unable to load invoices"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const { invoices, pagination } = listQuery.data;

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (value, row) => (
        <Link to={`/admin/invoices/${row.id}`} className="font-medium hover:underline">
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
      render: (value) => value || '—',
    },
    {
      key: 'amountDue',
      header: 'Amount',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <Badge variant={value === 'void' ? 'danger' : value === 'issued' ? 'success' : 'neutral'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'issuedAt',
      header: 'Issued',
      render: (value) => (value ? new Date(value).toLocaleString() : '—'),
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Invoices</h1>
      <p className="mt-1 text-sm text-muted">
        Amounts charged for orders. Receipts are issued separately when payment is confirmed.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            label="Search"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Invoice #, order #…"
          />
        </div>
        <div className="w-40">
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'issued', label: 'Issued' },
              { value: 'void', label: 'Void' },
              { value: 'draft', label: 'Draft' },
            ]}
          />
        </div>
      </div>

      <div className="mt-4">
        {invoices?.length ? (
          <Table columns={columns} rows={invoices} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No invoices"
            description="Invoices are created when a payment is approved."
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
