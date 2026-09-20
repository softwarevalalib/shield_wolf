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

function labelType(type) {
  return String(type || '').replaceAll('_', ' ');
}

function statusVariant(status) {
  if (status === 'posted') return 'success';
  if (status === 'void') return 'danger';
  return 'warning';
}

/**
 * Admin transaction ledger.
 */
export function AdminTransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      type: searchParams.get('type') || 'all',
      status: searchParams.get('status') || 'all',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams]
  );

  const listQuery = useQuery({
    queryKey: ['admin', 'transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('type', filters.type);
      params.set('status', filters.status);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/transactions?${params}`);
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
        title="Unable to load transactions"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const { transactions, pagination } = listQuery.data;

  const columns = [
    {
      key: 'transactionNumber',
      header: 'Txn',
      render: (value, row) => (
        <Link to={`/admin/transactions/${row.id}`} className="font-medium hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'occurredAt',
      header: 'When',
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => labelType(v),
    },
    {
      key: 'orderNumber',
      header: 'Order',
      render: (value, row) =>
        value && row.orderId ? (
          <Link to={`/admin/orders/${row.orderId}`} className="hover:underline">
            {value}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (v, row) => formatMoney(v, row.currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <Badge variant={statusVariant(v)}>{v}</Badge>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (v) => <span className="text-xs text-muted break-all">{v || '—'}</span>,
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Transactions</h1>
      <p className="mt-1 text-sm text-muted">
        Ledger of sales, payments, refunds, expenses, and delivery income.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="min-w-[180px] flex-1">
          <Input
            label="Search"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Txn #, order #, reference…"
          />
        </div>
        <div className="w-44">
          <Select
            label="Type"
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value)}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'sale', label: 'Sale' },
              { value: 'payment', label: 'Payment' },
              { value: 'refund', label: 'Refund' },
              { value: 'expense', label: 'Expense' },
              { value: 'delivery_income', label: 'Delivery income' },
              { value: 'adjustment', label: 'Adjustment' },
            ]}
          />
        </div>
        <div className="w-36">
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'posted', label: 'Posted' },
              { value: 'void', label: 'Void' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        </div>
      </div>

      <div className="mt-4">
        {transactions?.length ? (
          <Table columns={columns} rows={transactions} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No transactions"
            description="Ledger entries appear when payments are approved or expenses are recorded."
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
