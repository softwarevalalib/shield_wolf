import { cn } from '@/utils/cn';

function formatAmount(amount, currency) {
  if (amount == null || Number.isNaN(Number(amount))) return null;

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

/**
 * Displays a provided price only — never invents amounts.
 */
export function PriceDisplay({ amount, currency = 'LRD', compareAt, className, ...props }) {
  const formatted = formatAmount(amount, currency);
  const compareFormatted =
    compareAt != null && compareAt !== '' ? formatAmount(compareAt, currency) : null;

  if (formatted == null) {
    return (
      <span className={cn('text-sm text-muted', className)} {...props}>
        Price unavailable
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-baseline gap-2', className)} {...props}>
      <span className="text-base font-semibold text-charcoal">{formatted}</span>
      {compareFormatted ? (
        <span className="text-sm text-muted line-through">{compareFormatted}</span>
      ) : null}
    </span>
  );
}
