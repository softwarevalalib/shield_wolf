import { cn } from '@/utils/cn';

/**
 * Lightweight horizontal bar list for finance breakdowns (no chart library).
 */
export function FinanceBarList({ items = [], valueKey = 'amount', labelKey = 'name', className }) {
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey] || 0)));

  if (!items.length) {
    return <p className="text-sm text-muted">No data in this range.</p>;
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item) => {
        const value = Number(item[valueKey] || 0);
        const width = `${Math.max(2, (value / max) * 100)}%`;
        return (
          <li key={item[labelKey] || item.method || item.day}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-charcoal">{item[labelKey] || item.method}</span>
              <span className="shrink-0 tabular-nums text-muted">{value.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-sm bg-off-white">
              <div className="h-full rounded-sm bg-charcoal/80" style={{ width }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Simple SVG spark/area trend for daily amounts.
 */
export function FinanceTrendChart({ series = [], className, height = 120 }) {
  if (!series.length) {
    return <p className="text-sm text-muted">No trend data in this range.</p>;
  }

  const values = series.map((p) => Number(p.amount || p.sales || 0));
  const max = Math.max(1, ...values);
  const w = 320;
  const h = height;
  const pad = 4;
  const step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('h-auto w-full text-charcoal', className)}
      role="img"
      aria-label="Trend chart"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
