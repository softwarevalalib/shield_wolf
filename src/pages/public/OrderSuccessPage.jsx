import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import {
  CheckoutSteps,
  MarketplacePageBanner,
} from '@/components/layout/MarketplacePageChrome';
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

const paymentLabels = {
  cod: 'Cash on Delivery',
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
};

export function OrderSuccessPage() {
  const [params] = useSearchParams();
  const orderRef = params.get('order');

  const orderQuery = useQuery({
    queryKey: ['orders', 'success', orderRef],
    enabled: Boolean(orderRef),
    queryFn: async () => {
      const payload = await apiClient.get(`/orders/${encodeURIComponent(orderRef)}`);
      return payload.data?.order;
    },
  });

  if (!orderRef) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No order reference"
          description="Place an order from checkout to see confirmation details."
          action={
            <Link
              to="/shop"
              className="inline-flex rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
            >
              Continue shopping
            </Link>
          }
        />
      </div>
    );
  }

  if (orderQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState
          title="Unable to load order"
          description="Check the order number or try again."
          onRetry={() => orderQuery.refetch()}
        />
      </div>
    );
  }

  const order = orderQuery.data;

  return (
    <div className="bg-off-white">
      <MarketplacePageBanner
        title="Order confirmed"
        subtitle={`Thank you. Order ${order.orderNumber} has been received.`}
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Breadcrumb
          className="mb-4"
          items={[{ label: 'Home', to: '/' }, { label: 'Order confirmation' }]}
        />
        <CheckoutSteps current="done" />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge variant="success">{order.status.replaceAll('_', ' ')}</Badge>
          <span className="text-sm font-medium text-charcoal">{order.orderNumber}</span>
        </div>

        {order.timeline ? (
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-charcoal">Progress</h2>
            <OrderStatusTimeline timeline={order.timeline} />
          </section>
        ) : null}

        <section className="mt-4 space-y-3 rounded-md border border-border bg-surface p-5 text-sm">
          <h2 className="font-display text-lg font-semibold text-charcoal">Summary</h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {order.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex justify-between gap-3 px-3 py-2.5">
                <span className="text-muted">
                  {item.name}
                  {item.size ? ` (${item.size})` : ''} × {item.quantity}
                </span>
                <span className="font-medium">{formatMoney(item.lineTotal, order.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-border pt-4">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatMoney(order.subtotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Delivery</dt>
              <dd>{formatMoney(order.deliveryFee, order.currency)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-semibold text-shield-red">
                {formatMoney(order.total, order.currency)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-4 space-y-2 rounded-md border border-border bg-surface p-5 text-sm">
          <h2 className="font-display text-lg font-semibold text-charcoal">Delivery</h2>
          <p className="text-muted">
            {[order.delivery?.community, order.delivery?.city, order.delivery?.county]
              .filter(Boolean)
              .join(', ')}
          </p>
          {order.delivery?.streetLandmark ? (
            <p className="text-muted">{order.delivery.streetLandmark}</p>
          ) : null}
          {order.delivery?.zoneName ? (
            <p className="text-muted">Zone: {order.delivery.zoneName}</p>
          ) : null}
        </section>

        {order.payment ? (
          <section className="mt-4 space-y-2 rounded-md border border-border bg-surface p-5 text-sm">
            <h2 className="font-display text-lg font-semibold text-charcoal">Payment</h2>
            <p className="text-muted">
              {paymentLabels[order.payment.method] || order.payment.method} ·{' '}
              <span className="capitalize">{order.payment.status.replaceAll('_', ' ')}</span>
            </p>
          </section>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {order.payment &&
          (order.payment.method === 'mtn_momo' || order.payment.method === 'orange_money') &&
          order.payment.status !== 'paid' ? (
            <Link
              to={`/complete-payment?order=${encodeURIComponent(order.orderNumber)}`}
              className="inline-flex rounded-md bg-shield-red px-4 py-2 text-sm font-medium text-white"
            >
              Complete payment
            </Link>
          ) : null}
          <Link
            to={`/track-order?order=${encodeURIComponent(order.orderNumber)}`}
            className="inline-flex rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white"
          >
            Track order
          </Link>
          <Link
            to="/shop"
            className="inline-flex rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-charcoal"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
