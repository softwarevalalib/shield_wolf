import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Badge } from '@/components/common/Badge';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

/**
 * Customer invoices list.
 */
export function CustomerInvoicesPage() {
  const listQuery = useQuery({
    queryKey: ['account', 'invoices'],
    queryFn: async () => {
      const payload = await apiClient.get('/account/invoices');
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
        title="Unable to load invoices"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const invoices = listQuery.data?.invoices || [];

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (value, row) => (
        <Link to={`/account/invoices/${row.id}`} className="font-medium hover:underline">
          {value}
        </Link>
      ),
    },
    { key: 'orderNumber', header: 'Order' },
    {
      key: 'amountDue',
      header: 'Amount',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={value === 'void' ? 'danger' : 'success'}>{value}</Badge>,
    },
    {
      key: 'issuedAt',
      header: 'Issued',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Invoices</h1>
      <p className="mt-1 text-sm text-muted">
        Charges for your orders. Preview, print, or save as PDF.
      </p>

      <div className="mt-6">
        {invoices.length ? (
          <Table columns={columns} rows={invoices} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No invoices yet"
            description="Invoices appear after payment is confirmed."
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
