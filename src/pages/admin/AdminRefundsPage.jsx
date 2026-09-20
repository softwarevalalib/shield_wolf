import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

/**
 * Refund ledger view — issue refunds from payment detail.
 */
export function AdminRefundsPage() {
  const listQuery = useQuery({
    queryKey: ['admin', 'refunds'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/refunds');
      return payload.data;
    },
  });

  if (listQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        title="Unable to load refunds"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const refunds = listQuery.data?.refunds || [];

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
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Refunds</h1>
      <p className="mt-1 text-sm text-muted">
        Refund ledger entries. To issue a refund, open a paid payment and choose Refund.
      </p>
      <p className="mt-2 text-sm">
        <Link to="/admin/payments?status=paid" className="text-shield-red hover:underline">
          Browse paid payments
        </Link>
      </p>

      <div className="mt-6">
        {refunds.length ? (
          <Table columns={columns} rows={refunds} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No refunds yet"
            description="Refund transactions appear after a paid payment is refunded."
          />
        )}
      </div>
    </div>
  );
}
