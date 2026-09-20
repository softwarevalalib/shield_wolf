import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { StatCard } from '@/components/common/StatCard';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { DateRangePicker } from '@/components/common/DateRangePicker';
import { Select } from '@/components/forms/Select';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
];

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

/**
 * Sales detail — daily totals, top products, recent orders.
 */
export function AdminFinanceSalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const range = searchParams.get('range') || '30d';
    return {
      range,
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
    };
  }, [searchParams]);

  const salesQuery = useQuery({
    queryKey: ['admin', 'finance', 'sales', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('view', 'sales');
      if (filters.range === 'custom' && filters.from && filters.to) {
        params.set('from', filters.from);
        params.set('to', filters.to);
      } else {
        params.set('range', filters.range === 'custom' ? '30d' : filters.range);
      }
      const payload = await apiClient.get(`/admin/finance?${params}`);
      return payload.data;
    },
  });

  function setRange(value) {
    const next = new URLSearchParams(searchParams);
    next.set('range', value);
    if (value !== 'custom') {
      next.delete('from');
      next.delete('to');
    }
    setSearchParams(next);
  }

  function setCustom({ startDate, endDate }) {
    const next = new URLSearchParams(searchParams);
    next.set('range', 'custom');
    if (startDate) next.set('from', startDate);
    else next.delete('from');
    if (endDate) next.set('to', endDate);
    else next.delete('to');
    setSearchParams(next);
  }

  if (salesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (salesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load sales"
        description={salesQuery.error.message}
        onRetry={() => salesQuery.refetch()}
      />
    );
  }

  const { summary, daily, topProducts, recentOrders, range, currency } = salesQuery.data;

  const dailyColumns = [
    { key: 'day', header: 'Day' },
    { key: 'orders', header: 'Orders' },
    {
      key: 'gross',
      header: 'Gross',
      render: (v) => formatMoney(v, currency),
    },
    {
      key: 'net',
      header: 'Net',
      render: (v) => formatMoney(v, currency),
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (v) => formatMoney(v, currency),
    },
    {
      key: 'total',
      header: 'Total',
      render: (v) => formatMoney(v, currency),
    },
  ];

  const productColumns = [
    { key: 'name', header: 'Product' },
    { key: 'sku', header: 'SKU', render: (v) => v || '—' },
    { key: 'quantity', header: 'Qty' },
    {
      key: 'revenue',
      header: 'Line revenue',
      render: (v) => formatMoney(v, currency),
    },
  ];

  const orderColumns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (value, row) => (
        <Link to={`/admin/orders/${row.id}`} className="font-medium hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => String(v || '').replaceAll('_', ' '),
    },
    {
      key: 'total',
      header: 'Total',
      render: (v, row) => formatMoney(v, row.currency || currency),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (v) => (v ? new Date(v).toLocaleString() : '—'),
    },
  ];

  return (
    <div>
      <p className="text-sm text-muted">
        <Link to="/admin/finance" className="hover:underline">
          Finance
        </Link>
        <span aria-hidden="true"> / </span>
        Sales
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-charcoal">Sales</h1>
      <p className="mt-1 text-sm text-muted">
        {range.fromLabel} → {range.toLabel}. Order totals for recognized sales statuses.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select
            label="Period"
            value={filters.range}
            onChange={(e) => setRange(e.target.value)}
            options={RANGE_OPTIONS}
          />
        </div>
        {filters.range === 'custom' ? (
          <DateRangePicker
            className="min-w-[280px] flex-1"
            startDate={filters.from}
            endDate={filters.to}
            onChange={setCustom}
          />
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Orders" value={summary.orders} />
        <StatCard label="Gross sales" value={formatMoney(summary.grossSales, currency)} />
        <StatCard label="Net sales" value={formatMoney(summary.netSales, currency)} />
        <StatCard label="Discounts" value={formatMoney(summary.discounts, currency)} />
        <StatCard label="Delivery" value={formatMoney(summary.deliveryRevenue, currency)} />
        <StatCard label="AOV" value={formatMoney(summary.averageOrderValue, currency)} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-charcoal">Daily breakdown</h2>
        <div className="mt-3">
          {daily?.length ? (
            <Table columns={dailyColumns} rows={daily} getRowKey={(row) => row.day} />
          ) : (
            <EmptyState title="No sales days" description="No recognized orders in this range." />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-charcoal">Top products</h2>
        <div className="mt-3">
          {topProducts?.length ? (
            <Table
              columns={productColumns}
              rows={topProducts}
              getRowKey={(row, i) => `${row.name}-${i}`}
            />
          ) : (
            <EmptyState
              title="No product sales"
              description="Line items appear after paid orders."
            />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-charcoal">Recent orders</h2>
        <div className="mt-3">
          {recentOrders?.length ? (
            <Table columns={orderColumns} rows={recentOrders} getRowKey={(row) => row.id} />
          ) : (
            <EmptyState title="No orders" description="Orders in this period will list here." />
          )}
        </div>
      </section>
    </div>
  );
}
