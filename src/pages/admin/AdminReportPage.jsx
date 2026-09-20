import { useMemo } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnyPermission } from '@/utils/permissions';
import { Button } from '@/components/common/Button';
import { StatCard } from '@/components/common/StatCard';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { DateRangePicker } from '@/components/common/DateRangePicker';
import { Select } from '@/components/forms/Select';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { getAccessToken } from '@/services/authTokenStorage';
import { useNotification } from '@/contexts/NotificationContext';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
];

const TITLES = {
  sales: 'Sales reports',
  orders: 'Orders reports',
  products: 'Product reports',
  customers: 'Customer reports',
  inventory: 'Inventory reports',
  delivery: 'Delivery reports',
  finance: 'Financial reports',
};

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function formatCell(key, value, row, currency) {
  if (value == null || value === '') return '—';
  if (
    ['gross', 'net', 'total', 'discounts', 'delivery', 'revenue', 'spend', 'amount'].includes(
      key
    ) ||
    key.toLowerCase().includes('revenue') ||
    key.toLowerCase().includes('spend') ||
    key.toLowerCase().includes('amount')
  ) {
    return formatMoney(value, row.currency || currency);
  }
  if (key === 'status' || key === 'method') return String(value).replaceAll('_', ' ');
  if (key === 'createdAt' || key === 'lastOrderAt') {
    return value ? new Date(value).toLocaleString() : '—';
  }
  if (key === 'successRate') return `${value}%`;
  return String(value);
}

/**
 * Single report view with date filters and CSV export.
 */
export function AdminReportPage() {
  const { reportType: paramType } = useParams();
  const location = useLocation();
  const notify = useNotification();
  const reportType =
    paramType || (location.pathname.includes('/finance/reports') ? 'finance' : 'sales');
  const { user } = useAuth();
  const canExport = hasAnyPermission(user, ['reports.export', 'reports.view']);
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const range = searchParams.get('range') || '30d';
    return {
      range,
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
    };
  }, [searchParams]);

  const needsRange = reportType !== 'inventory';

  const reportQuery = useQuery({
    queryKey: ['admin', 'reports', reportType, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('type', reportType);
      if (needsRange) {
        if (filters.range === 'custom' && filters.from && filters.to) {
          params.set('from', filters.from);
          params.set('to', filters.to);
        } else {
          params.set('range', filters.range === 'custom' ? '30d' : filters.range);
        }
      }
      const payload = await apiClient.get(`/admin/reports?${params}`);
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

  async function downloadCsv() {
    const params = new URLSearchParams();
    params.set('type', reportType);
    params.set('format', 'csv');
    if (needsRange) {
      if (filters.range === 'custom' && filters.from && filters.to) {
        params.set('from', filters.from);
        params.set('to', filters.to);
      } else {
        params.set('range', filters.range === 'custom' ? '30d' : filters.range);
      }
    }
    const token = getAccessToken();
    const res = await fetch(`/api/admin/reports?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Export failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (reportQuery.isError) {
    return (
      <ErrorState
        title="Unable to load report"
        description={reportQuery.error.message}
        onRetry={() => reportQuery.refetch()}
      />
    );
  }

  const report = reportQuery.data;
  const currency = report.currency || 'LRD';
  const summary = report.summary || {};
  const sections =
    report.sections?.length > 0
      ? report.sections
      : [{ id: 'main', title: report.title, columns: report.columns, rows: report.rows }];

  const summaryCards = Object.entries(summary)
    .filter(([, v]) => v == null || typeof v !== 'object')
    .slice(0, 8);

  return (
    <div>
      <p className="text-sm text-muted">
        <Link to="/admin/reports" className="hover:underline">
          Reports
        </Link>
        <span aria-hidden="true"> / </span>
        {TITLES[reportType] || reportType}
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {TITLES[reportType] || report.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {report.range
              ? `${report.range.fromLabel} → ${report.range.toLabel}`
              : 'Current inventory snapshot'}
          </p>
        </div>
        {canExport ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv().catch((e) => notify.error(e.message || 'Export failed'))}
          >
            Export CSV
          </Button>
        ) : null}
      </div>

      {needsRange ? (
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
      ) : null}

      {summaryCards.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map(([key, value]) => (
            <StatCard
              key={key}
              label={String(key)
                .replaceAll(/([A-Z])/g, ' $1')
                .replace(/^./, (c) => c.toUpperCase())}
              value={
                typeof value === 'number' &&
                /sales|revenue|spend|gross|net|total|value|expense|profit|payment|delivery|discount/i.test(
                  key
                )
                  ? formatMoney(value, currency)
                  : typeof value === 'number' && key === 'successRate'
                    ? `${value}%`
                    : value
              }
            />
          ))}
        </div>
      ) : null}

      {Array.isArray(summary.byStatus) ? (
        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold text-charcoal">By status</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {summary.byStatus.map((row) => (
              <li
                key={row.status}
                className="flex justify-between rounded-md border border-border bg-surface px-3 py-2"
              >
                <span className="capitalize">{String(row.status).replaceAll('_', ' ')}</span>
                <span className="tabular-nums text-muted">
                  {row.count}
                  {row.total != null ? ` · ${formatMoney(row.total, currency)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.map((section) => {
        const columns = (section.columns || []).map((col) => ({
          key: col.key,
          header: col.header,
          render: (value, row) => formatCell(col.key, value, row, currency),
        }));
        return (
          <section key={section.id || section.title} className="mt-8">
            <h2 className="font-display text-lg font-semibold text-charcoal">{section.title}</h2>
            <div className="mt-3">
              {section.rows?.length ? (
                <Table
                  columns={columns}
                  rows={section.rows}
                  getRowKey={(row, i) =>
                    row.id || row.orderNumber || row.day || `${section.id}-${i}`
                  }
                />
              ) : (
                <EmptyState title="No rows" description="Nothing matched this period." />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
