import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/common/Badge';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ADMIN_NAV_GROUPS } from '@/config/adminNav';
import { hasAnyPermission, isStaffUser } from '@/utils/permissions';
import { apiClient } from '@/services/apiClient';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

/**
 * Admin home — live operational metrics + shortcuts.
 */
export function AdminDashboardPage() {
  const { user, permissions, roles } = useAuth();

  const dashQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/dashboard');
      return payload.data;
    },
  });

  if (dashQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (dashQuery.isError) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        description={dashQuery.error?.message || 'Confirm you are signed in as staff.'}
        onRetry={() => dashQuery.refetch()}
      />
    );
  }

  const displayName = user?.adminProfile?.displayName || user?.email || 'Staff';
  const metrics = dashQuery.data?.metrics || {};
  const recentOrders = dashQuery.data?.recentOrders || [];

  const shortcuts = ADMIN_NAV_GROUPS.flatMap((group) =>
    group.items
      .filter((item) => item.to !== '/admin')
      .filter((item) => !item.permissions || hasAnyPermission(user, item.permissions))
      .slice(0, 2)
      .map((item) => ({ ...item, group: group.label }))
  ).slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">Overview</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-charcoal">
          Welcome back, {displayName.split(' ')[0]}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Live store operations for Shield Wolf. Metrics reflect the connected database — not demo
          placeholders.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(roles.length ? roles : []).map((role) => (
            <Badge key={role} variant="info">
              {role.replaceAll('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders today"
          value={metrics.ordersToday ?? 0}
          hint={`${metrics.ordersOpen ?? 0} open in progress`}
        />
        <StatCard
          label="Payments to review"
          value={metrics.paymentsPending ?? 0}
          hint="Pending / submitted / under review"
        />
        <StatCard
          label="Active deliveries"
          value={metrics.deliveriesActive ?? 0}
          hint="Not yet delivered or closed"
        />
        <StatCard
          label="Catalog"
          value={metrics.productsPublished ?? 0}
          hint={`${metrics.lowStock ?? 0} low stock · ${metrics.customers ?? 0} customers`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-md border border-border bg-surface p-4 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-charcoal">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-shield-red hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No orders yet. New checkouts will appear here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="font-medium text-charcoal hover:text-shield-red"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-medium text-charcoal">
                      {formatMoney(order.grandTotal, order.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isStaffUser(user) && shortcuts.length ? (
          <section className="rounded-md border border-border bg-surface p-4 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold text-charcoal">Quick open</h2>
            <p className="mt-1 text-sm text-muted">Permission-aware shortcuts.</p>
            <ul className="mt-4 grid gap-2">
              {shortcuts.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="flex items-center justify-between rounded-md border border-border bg-off-white px-3 py-2.5 text-sm text-charcoal transition-colors hover:border-charcoal hover:bg-surface"
                  >
                    <span>
                      <span className="block text-[10px] uppercase tracking-wide text-muted">
                        {item.group}
                      </span>
                      {item.label}
                    </span>
                    <span aria-hidden="true" className="text-muted">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              {(permissions.length || 0)} permissions on this account
              {roles.includes('super_admin') ? ' · super admin bypass active' : ''}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
