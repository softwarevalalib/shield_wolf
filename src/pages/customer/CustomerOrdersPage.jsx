import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/services/apiClient';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

export function CustomerOrdersPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') || 1);

  const ordersQuery = useQuery({
    queryKey: ['account', 'orders', page],
    queryFn: async () => {
      const payload = await apiClient.get(`/account/orders?page=${page}&pageSize=10`);
      return payload.data;
    },
  });

  if (ordersQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <ErrorState
        title="Unable to load orders"
        description="Check your connection and try again."
        onRetry={() => ordersQuery.refetch()}
      />
    );
  }

  const orders = ordersQuery.data?.orders || [];
  const pagination = ordersQuery.data?.pagination;

  if (!orders.length) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal">Orders</h1>
        <div className="mt-6">
          <EmptyState
            title="No orders yet"
            description="When you place an order, it will show up here."
            action={
              <Link
                to="/shop"
                className="inline-flex rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
              >
                Browse shop
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Orders</h1>
      <p className="mt-1 text-sm text-muted">View and track your Shield Wolf orders.</p>

      <ul className="mt-6 divide-y divide-border border-y border-border">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <Link
                to={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                className="font-medium text-charcoal hover:underline"
              >
                {order.orderNumber}
              </Link>
              <p className="mt-0.5 text-xs text-muted">
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={order.status} />
              <span className="text-sm font-medium">
                {formatMoney(order.total, order.currency)}
              </span>
              <Link
                to={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                className="text-sm text-muted underline hover:text-charcoal"
              >
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {pagination && pagination.pageCount > 1 ? (
        <div className="mt-6">
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={(next) => setParams({ page: String(next) })}
          />
        </div>
      ) : null}
    </div>
  );
}
