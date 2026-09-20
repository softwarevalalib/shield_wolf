import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
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

function statusBadgeVariant(status) {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  if (status === 'awaiting_payment' || status === 'out_for_delivery') return 'warning';
  return 'info';
}

/**
 * Customer account dashboard overview.
 */
export function AccountOverviewPage() {
  const { user } = useAuth();
  const overviewQuery = useQuery({
    queryKey: ['account', 'overview'],
    queryFn: async () => {
      const payload = await apiClient.get('/account/overview');
      return payload.data?.overview;
    },
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <ErrorState
        title="Unable to load account overview"
        description="Check your connection and try again."
        onRetry={() => overviewQuery.refetch()}
      />
    );
  }

  const overview = overviewQuery.data;
  const firstName = overview.welcomeName || 'there';

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Welcome, {firstName}</h1>
      <p className="mt-2 text-sm text-muted">
        Signed in as {user?.email || user?.phone || 'your account'}.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total orders" value={overview.stats.totalOrders} />
        <StatCard label="Saved addresses" value={overview.stats.savedAddresses} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-charcoal">Recent order</h2>
            <Link to="/account/orders" className="text-sm text-muted underline hover:text-charcoal">
              All orders
            </Link>
          </div>
          {overview.recentOrder ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/account/orders/${encodeURIComponent(overview.recentOrder.orderNumber)}`}
                  className="font-medium text-charcoal hover:underline"
                >
                  {overview.recentOrder.orderNumber}
                </Link>
                <Badge variant={statusBadgeVariant(overview.recentOrder.status)}>
                  {overview.recentOrder.status.replaceAll('_', ' ')}
                </Badge>
              </div>
              <p className="text-muted">
                {formatMoney(overview.recentOrder.total, overview.recentOrder.currency)}
                {overview.recentOrder.createdAt
                  ? ` · ${new Date(overview.recentOrder.createdAt).toLocaleString()}`
                  : ''}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  to={`/track-order?order=${encodeURIComponent(overview.recentOrder.orderNumber)}`}
                  className="text-sm underline hover:text-charcoal"
                >
                  Track
                </Link>
                <Link
                  to={`/account/orders/${encodeURIComponent(overview.recentOrder.orderNumber)}`}
                  className="text-sm underline hover:text-charcoal"
                >
                  View
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState
                title="No orders yet"
                description="When you place an order, it will show up here."
                action={
                  <Link
                    to="/shop"
                    className="inline-flex rounded-md bg-charcoal px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Browse shop
                  </Link>
                }
              />
            </div>
          )}
        </section>

        <section className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-charcoal">Current delivery</h2>
            <Link
              to="/account/deliveries"
              className="text-sm text-muted underline hover:text-charcoal"
            >
              Deliveries
            </Link>
          </div>
          {overview.currentDelivery ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-charcoal">
                  {overview.currentDelivery.orderNumber}
                </span>
                <Badge variant={statusBadgeVariant(overview.currentDelivery.status)}>
                  {overview.currentDelivery.status.replaceAll('_', ' ')}
                </Badge>
              </div>
              {overview.currentDelivery.delivery ? (
                <p className="text-muted">
                  {[
                    overview.currentDelivery.delivery.community,
                    overview.currentDelivery.delivery.city,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              ) : null}
              <Link
                to={`/track-order?order=${encodeURIComponent(overview.currentDelivery.orderNumber)}`}
                className="inline-block text-sm underline hover:text-charcoal"
              >
                Track delivery
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No active deliveries right now.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-md border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-charcoal">Saved address</h2>
          <Link
            to="/account/addresses"
            className="text-sm text-muted underline hover:text-charcoal"
          >
            Manage
          </Link>
        </div>
        {overview.defaultAddress ? (
          <div className="mt-3 text-sm text-muted">
            <p className="font-medium text-charcoal">
              {overview.defaultAddress.label || 'Default'}
            </p>
            <p>
              {[
                overview.defaultAddress.streetLandmark,
                overview.defaultAddress.community,
                overview.defaultAddress.city,
                overview.defaultAddress.county,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No saved address yet.{' '}
            <Link to="/account/addresses" className="underline hover:text-charcoal">
              Add one
            </Link>
          </p>
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/account/orders"
          className="inline-flex rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
        >
          View orders
        </Link>
        <Link
          to="/track-order"
          className="inline-flex rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-charcoal"
        >
          Track an order
        </Link>
        <Link
          to="/shop"
          className="inline-flex rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-charcoal"
        >
          Browse shop
        </Link>
      </div>
    </div>
  );
}
