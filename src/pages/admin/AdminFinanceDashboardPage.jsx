import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { StatCard } from '@/components/common/StatCard';
import { Skeleton } from '@/components/common/Skeleton';
import { DateRangePicker } from '@/components/common/DateRangePicker';
import { Select } from '@/components/forms/Select';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FinanceBarList, FinanceTrendChart } from '@/components/admin/FinanceCharts';

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

function labelMethod(method) {
  return String(method || '').replaceAll('_', ' ');
}

/**
 * Admin financial dashboard — real KPIs; revenue ≠ profit.
 */
export function AdminFinanceDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const range = searchParams.get('range') || '30d';
    return {
      range,
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
    };
  }, [searchParams]);

  const financeQuery = useQuery({
    queryKey: ['admin', 'finance', 'dashboard', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('view', 'dashboard');
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

  if (financeQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (financeQuery.isError) {
    return (
      <ErrorState
        title="Unable to load finance dashboard"
        description={financeQuery.error.message}
        onRetry={() => financeQuery.refetch()}
      />
    );
  }

  const { metrics, charts, definitions, range, currency } = financeQuery.data;
  const paymentMethodItems = (charts.paymentMethods || []).map((m) => ({
    name: labelMethod(m.method),
    amount: m.amount,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Finance</h1>
          <p className="mt-1 text-sm text-muted">
            {range.fromLabel} → {range.toLabel}. Revenue is collected payments — not profit.
          </p>
        </div>
        <Link
          to="/admin/finance/sales"
          className="inline-flex rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-off-white"
        >
          Sales detail
        </Link>
      </div>

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

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Gross sales" value={formatMoney(metrics.grossSales, currency)} />
        <StatCard
          label="Net sales"
          value={formatMoney(metrics.netSales, currency)}
          hint="Gross − discounts"
        />
        <StatCard
          label="Revenue (paid)"
          value={formatMoney(metrics.revenue, currency)}
          hint="Collected — not profit"
        />
        <StatCard label="COGS" value={formatMoney(metrics.cogs, currency)} hint="From cost_price" />
        <StatCard
          label="Gross profit"
          value={formatMoney(metrics.grossProfit, currency)}
          hint="Net sales − COGS"
        />
        <StatCard label="Expenses" value={formatMoney(metrics.expenses, currency)} />
        <StatCard label="Discounts" value={formatMoney(metrics.discounts, currency)} />
        <StatCard label="Refunds" value={formatMoney(metrics.refunds, currency)} />
        <StatCard label="Delivery revenue" value={formatMoney(metrics.deliveryRevenue, currency)} />
        <StatCard
          label="Outstanding payments"
          value={formatMoney(metrics.outstandingPayments, currency)}
          hint={`${metrics.outstandingPaymentCount} pending`}
        />
        <StatCard label="Paid orders" value={metrics.paidOrders} />
        <StatCard
          label="Avg order value"
          value={formatMoney(metrics.averageOrderValue, currency)}
        />
        <StatCard
          label="Est. operating profit"
          value={formatMoney(metrics.estimatedOperatingProfit, currency)}
          hint="Gross profit + delivery − expenses − refunds"
        />
      </div>

      <p className="mt-3 text-xs text-muted">
        {definitions.grossProfit} {definitions.estimatedOperatingProfit}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-semibold text-charcoal">Revenue trend</h2>
          <p className="text-xs text-muted">Paid payments by day</p>
          <div className="mt-3">
            <FinanceTrendChart series={charts.revenueTrend} />
          </div>
        </section>
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-semibold text-charcoal">Profit trend</h2>
          <p className="text-xs text-muted">Daily net sales − expenses (estimate)</p>
          <div className="mt-3">
            <FinanceTrendChart series={charts.profitTrend} />
          </div>
        </section>
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-semibold text-charcoal">By category</h2>
          <div className="mt-3">
            <FinanceBarList items={charts.revenueByCategory} />
          </div>
        </section>
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-semibold text-charcoal">By product</h2>
          <div className="mt-3">
            <FinanceBarList items={charts.revenueByProduct} />
          </div>
        </section>
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-semibold text-charcoal">Payment methods</h2>
          <div className="mt-3">
            <FinanceBarList items={paymentMethodItems} />
          </div>
        </section>
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-display text-lg font-semibold text-charcoal">Sales vs expenses</h2>
          <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-sm">
            {(charts.salesVsExpenses || []).slice(-14).map((row) => (
              <li
                key={row.day}
                className="flex justify-between gap-3 border-b border-border/60 py-1"
              >
                <span className="text-muted">{row.day}</span>
                <span className="tabular-nums">
                  {Number(row.sales).toLocaleString()} / {Number(row.expenses).toLocaleString()}
                </span>
              </li>
            ))}
            {!charts.salesVsExpenses?.length ? (
              <li className="text-muted">No daily rows.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
