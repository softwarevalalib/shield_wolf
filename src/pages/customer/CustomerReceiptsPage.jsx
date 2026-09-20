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

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

/**
 * Customer receipts list.
 */
export function CustomerReceiptsPage() {
  const listQuery = useQuery({
    queryKey: ['account', 'receipts'],
    queryFn: async () => {
      const payload = await apiClient.get('/account/receipts');
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
        title="Unable to load receipts"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const receipts = listQuery.data?.receipts || [];

  const columns = [
    {
      key: 'receiptNumber',
      header: 'Receipt',
      render: (value, row) => (
        <Link to={`/account/receipts/${row.id}`} className="font-medium hover:underline">
          {value}
        </Link>
      ),
    },
    { key: 'orderNumber', header: 'Order' },
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
      render: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Receipts</h1>
      <p className="mt-1 text-sm text-muted">Confirmed payments. Preview, print, or save as PDF.</p>

      <div className="mt-6">
        {receipts.length ? (
          <Table columns={columns} rows={receipts} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No receipts yet"
            description="Receipts appear after payment verification."
            action={
              <Link
                to="/account/orders"
                className="inline-flex rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
              >
                View orders
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
