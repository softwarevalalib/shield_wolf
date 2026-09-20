import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

function statusVariant(status) {
  if (status === 'delivered' || status === 'paid') return 'success';
  if (status === 'cancelled' || status === 'refunded') return 'danger';
  if (status === 'awaiting_payment' || status === 'pending') return 'warning';
  return 'info';
}

/**
 * Admin order detail — timeline, items, status transitions, admin notes.
 */
export function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canUpdate = hasPermission(user, 'orders.update');

  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const orderQuery = useQuery({
    queryKey: ['admin', 'order', orderId],
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/orders/${orderId}`);
      return payload.data.order;
    },
  });

  useEffect(() => {
    if (orderQuery.data) {
      setAdminNotes(orderQuery.data.adminNotes || '');
      const allowed = orderQuery.data.allowedTransitions || [];
      setNextStatus(allowed[0] || '');
    }
  }, [orderQuery.data]);

  const statusMutation = useMutation({
    mutationFn: async () =>
      apiClient.patch(`/admin/orders/${orderId}`, {
        status: nextStatus,
        note: statusNote.trim() || null,
      }),
    onSuccess: () => {
      notify.success('Order status updated');
      setStatusNote('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (error) => notify.error(error.message || 'Status update failed'),
  });

  const notesMutation = useMutation({
    mutationFn: async () =>
      apiClient.patch(`/admin/orders/${orderId}`, { adminNotes: adminNotes.trim() || null }),
    onSuccess: () => {
      notify.success('Admin notes saved');
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
    },
    onError: (error) => notify.error(error.message || 'Could not save notes'),
  });

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <ErrorState
        title="Unable to load order"
        description={orderQuery.error.message}
        onRetry={() => orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;
  const allowed = order.allowedTransitions || [];

  return (
    <div>
      <p className="text-sm text-muted">
        <Link to="/admin/orders" className="hover:underline">
          Orders
        </Link>
        <span aria-hidden="true"> / </span>
        {order.orderNumber}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={statusVariant(order.status)}>{labelStatus(order.status)}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Customer timeline</h2>
            <OrderStatusTimeline className="mt-4" timeline={order.timeline} />
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Items</h2>
            <ul className="mt-3 divide-y divide-border">
              {order.items.map((item, index) => (
                <li key={`${item.productId || item.name}-${index}`} className="flex gap-3 py-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="size-14 rounded object-cover" />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded bg-off-white text-xs text-muted">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-charcoal">{item.name}</p>
                    <p className="text-xs text-muted">
                      Qty {item.quantity}
                      {item.size ? ` · ${item.size}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {formatMoney(item.lineTotal, order.currency)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatMoney(order.subtotal, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Discount</dt>
                <dd>{formatMoney(order.discountAmount, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd>{formatMoney(order.deliveryFee, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Tax</dt>
                <dd>{formatMoney(order.taxAmount, order.currency)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{formatMoney(order.total, order.currency)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Status history</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(order.statusHistory || []).map((entry) => (
                <li
                  key={entry.id || `${entry.toStatus}-${entry.at}`}
                  className="border-b border-border pb-2 last:border-0"
                >
                  <p className="font-medium text-charcoal">
                    {entry.fromStatus ? `${labelStatus(entry.fromStatus)} → ` : ''}
                    {labelStatus(entry.toStatus)}
                  </p>
                  <p className="text-xs text-muted">
                    {entry.at ? new Date(entry.at).toLocaleString() : ''}
                    {entry.changedByEmail ? ` · ${entry.changedByEmail}` : ''}
                  </p>
                  {entry.note ? <p className="mt-1 text-muted">{entry.note}</p> : null}
                </li>
              ))}
              {!order.statusHistory?.length ? (
                <li className="text-muted">No status history yet.</li>
              ) : null}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Customer</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="font-medium">
                  {[order.customer?.firstName, order.customer?.lastName]
                    .filter(Boolean)
                    .join(' ') ||
                    order.customer?.name ||
                    'Guest'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd>{order.phone || order.customer?.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd>{order.email || order.customer?.email || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Delivery address</h2>
            <p className="mt-2 text-sm text-charcoal">
              {[
                order.delivery?.streetLandmark || order.delivery?.address,
                order.delivery?.community,
                order.delivery?.city,
                order.delivery?.county,
              ]
                .filter(Boolean)
                .join(', ') || '—'}
            </p>
            {order.delivery?.zoneName ? (
              <p className="mt-1 text-xs text-muted">Zone: {order.delivery.zoneName}</p>
            ) : null}
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Payment</h2>
            {order.payment ? (
              <dl className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Method</dt>
                  <dd>{order.payment.method}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Status</dt>
                  <dd>{labelStatus(order.payment.status)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Amount</dt>
                  <dd>{formatMoney(order.payment.amount, order.payment.currency)}</dd>
                </div>
                {order.payment.reference ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Reference</dt>
                    <dd className="truncate">{order.payment.reference}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted">No payment record.</p>
            )}
            {order.payment?.id ? (
              <Link
                to={`/admin/payments/${order.payment.id}`}
                className="mt-2 inline-block text-sm text-shield-red hover:underline"
              >
                Open payment review
              </Link>
            ) : (
              <p className="mt-2 text-xs text-muted">No payment linked yet.</p>
            )}
          </section>

          {canUpdate ? (
            <section className="rounded-md border border-border bg-surface p-4">
              <h2 className="font-display text-lg font-semibold text-charcoal">Update status</h2>
              {allowed.length ? (
                <div className="mt-3 space-y-3">
                  <Select
                    label="Next status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                    options={allowed.map((status) => ({
                      value: status,
                      label: labelStatus(status),
                    }))}
                  />
                  <Textarea
                    label="Note (optional)"
                    rows={2}
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                  />
                  <Button
                    loading={statusMutation.isPending}
                    disabled={!nextStatus}
                    onClick={() => statusMutation.mutate()}
                  >
                    Apply status
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">No further transitions from this status.</p>
              )}
            </section>
          ) : null}

          {canUpdate ? (
            <section className="rounded-md border border-border bg-surface p-4">
              <h2 className="font-display text-lg font-semibold text-charcoal">Admin notes</h2>
              <p className="mt-1 text-xs text-muted">Internal only — not shown to customers.</p>
              <Textarea
                className="mt-3"
                rows={4}
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
              />
              <Button
                className="mt-3"
                variant="secondary"
                loading={notesMutation.isPending}
                onClick={() => notesMutation.mutate()}
              >
                Save notes
              </Button>
            </section>
          ) : null}

          {order.notes ? (
            <section className="rounded-md border border-border bg-surface p-4">
              <h2 className="font-display text-lg font-semibold text-charcoal">Customer notes</h2>
              <p className="mt-2 text-sm text-muted">{order.notes}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
