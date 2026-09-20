import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/forms/Input';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

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

const paymentLabels = {
  cod: 'Cash on Delivery',
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
};

function statusBadgeVariant(status) {
  if (status === 'delivered') return 'success';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  if (status === 'awaiting_payment' || status === 'out_for_delivery') return 'warning';
  return 'info';
}

export function TrackOrderPage() {
  const [params, setParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const prefillHint = useMemo(
    () => Boolean(params.get('order') && !order && !error),
    [params, order, error]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    setOrder(null);

    try {
      const payload = await apiClient.post('/orders/track', {
        orderNumber: orderNumber.trim(),
        phone: phone.trim(),
      });
      setOrder(payload.data?.order || null);
      setParams(
        {
          order: orderNumber.trim(),
        },
        { replace: true }
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to find that order'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ContentPageLayout
      title="Track order"
      subtitle="Enter your order number and the phone used at checkout."
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'Track order' },
      ]}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-md border border-border bg-surface p-5 sm:p-6"
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        {prefillHint ? (
          <Alert tone="info">
            Order number filled from your confirmation. Enter your phone to continue.
          </Alert>
        ) : null}
        <Input
          label="Order number"
          required
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="SW-2026-000001"
          autoComplete="off"
        />
        <Input
          label="Phone number"
          type="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Same phone used at checkout"
          autoComplete="tel"
        />
        <Button type="submit" variant="accent" loading={submitting}>
          Track order
        </Button>
      </form>

      {order ? (
        <section className="mt-6 space-y-6 rounded-md border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-semibold text-charcoal">{order.orderNumber}</h2>
            <Badge variant={statusBadgeVariant(order.status)}>
              {order.status.replaceAll('_', ' ')}
            </Badge>
          </div>

          <OrderStatusTimeline timeline={order.timeline} />

          <div className="space-y-3 text-sm">
            <h3 className="font-display text-lg font-semibold text-charcoal">Items</h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {order.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex justify-between gap-3 px-3 py-2.5"
                >
                  <span className="text-muted">
                    {item.name}
                    {item.size ? ` (${item.size})` : ''} × {item.quantity}
                  </span>
                  <span className="font-medium">{formatMoney(item.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-shield-red">
                {formatMoney(order.total, order.currency)}
              </span>
            </div>
          </div>

          {order.delivery ? (
            <div className="space-y-1 text-sm">
              <h3 className="font-display text-lg font-semibold text-charcoal">Delivery</h3>
              <p className="text-muted">
                {[order.delivery.community, order.delivery.city, order.delivery.county]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {order.delivery.zoneName ? (
                <p className="text-muted">Zone: {order.delivery.zoneName}</p>
              ) : null}
            </div>
          ) : null}

          {order.payment ? (
            <div className="space-y-1 text-sm">
              <h3 className="font-display text-lg font-semibold text-charcoal">Payment</h3>
              <p className="text-muted">
                {paymentLabels[order.payment.method] || order.payment.method} ·{' '}
                <span className="capitalize">{order.payment.status.replaceAll('_', ' ')}</span>
              </p>
            </div>
          ) : null}

          <p className="text-xs text-muted">
            Need help?{' '}
            <Link to="/contact" className="font-medium text-shield-red hover:underline">
              Contact us
            </Link>{' '}
            with your order number.
          </p>
        </section>
      ) : null}
    </ContentPageLayout>
  );
}
