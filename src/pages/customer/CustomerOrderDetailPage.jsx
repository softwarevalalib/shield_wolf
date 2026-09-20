import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { PaymentSubmitForm } from '@/components/payments/PaymentSubmitForm';
import { apiClient } from '@/services/apiClient';
import { useCart } from '@/hooks/useCart';
import { useNotification } from '@/contexts/NotificationContext';

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

export function CustomerOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { success, error: notifyError } = useNotification();

  const orderQuery = useQuery({
    queryKey: ['account', 'orders', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const payload = await apiClient.get(`/account/orders/${encodeURIComponent(id)}`);
      return payload.data?.order;
    },
  });

  function handleReorder() {
    const order = orderQuery.data;
    if (!order?.items?.length) return;
    let added = 0;
    for (const item of order.items) {
      if (!item.productId) continue;
      addItem({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity || 1,
        name: item.name,
        imageUrl: item.imageUrl,
        size: item.size,
        slug: item.slug,
      });
      added += 1;
    }
    if (!added) {
      notifyError('Unable to reorder — products are no longer available.');
      return;
    }
    success(`Added ${added} item${added === 1 ? '' : 's'} to your cart.`);
    navigate('/cart');
  }

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <ErrorState
        title="Unable to load order"
        description="This order may not exist or you may not have access."
        onRetry={() => orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/account/orders" className="text-sm text-muted hover:text-charcoal">
        ← Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-charcoal">{order.orderNumber}</h1>
        <Badge variant={statusBadgeVariant(order.status)}>
          {order.status.replaceAll('_', ' ')}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Placed {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
      </p>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-lg font-semibold text-charcoal">Progress</h2>
        <OrderStatusTimeline timeline={order.timeline} />
      </section>

      <section className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
        <h2 className="font-display text-lg font-semibold text-charcoal">Items</h2>
        <ul className="space-y-2">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
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
            <dd className="font-semibold">{formatMoney(order.total, order.currency)}</dd>
          </div>
        </dl>
      </section>

      {order.delivery ? (
        <section className="mt-8 space-y-1 border-t border-border pt-6 text-sm">
          <h2 className="font-display text-lg font-semibold text-charcoal">Delivery</h2>
          <p className="text-muted">
            {[order.delivery.community, order.delivery.city, order.delivery.county]
              .filter(Boolean)
              .join(', ')}
          </p>
          {order.delivery.streetLandmark ? (
            <p className="text-muted">{order.delivery.streetLandmark}</p>
          ) : null}
        </section>
      ) : null}

      {order.payment ? (
        <section className="mt-8 space-y-1 border-t border-border pt-6 text-sm">
          <h2 className="font-display text-lg font-semibold text-charcoal">Payment</h2>
          <p className="text-muted">
            {paymentLabels[order.payment.method] || order.payment.method} ·{' '}
            <span className="capitalize">{order.payment.status.replaceAll('_', ' ')}</span>
          </p>
          {order.payment.reference ? (
            <p className="text-muted">Reference: {order.payment.reference}</p>
          ) : null}
        </section>
      ) : null}

      {order.payment &&
      order.payment.status !== 'paid' &&
      (order.payment.method === 'mtn_momo' ||
        order.payment.method === 'orange_money' ||
        order.payment.method === 'cod') ? (
        <section className="mt-8 space-y-4 border-t border-border pt-6">
          <h2 className="font-display text-lg font-semibold text-charcoal">
            Submit Mobile Money details
          </h2>
          <PaymentSubmitForm
            orderNumber={order.orderNumber}
            requirePhone={false}
            lockedOrder
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['account', 'orders', id] });
            }}
          />
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" variant="accent" onClick={handleReorder}>
          Reorder
        </Button>
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
  );
}
