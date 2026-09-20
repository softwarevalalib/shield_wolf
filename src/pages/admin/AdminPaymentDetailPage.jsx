import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Textarea } from '@/components/forms/Textarea';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

function statusVariant(status) {
  if (status === 'paid') return 'success';
  if (status === 'rejected' || status === 'failed') return 'danger';
  if (status === 'pending_verification' || status === 'pending') return 'warning';
  return 'neutral';
}

/**
 * Admin payment review — approve, reject, or request clarification.
 */
export function AdminPaymentDetailPage() {
  const { paymentId } = useParams();
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canVerify = hasPermission(user, 'payments.verify');

  const [adminNote, setAdminNote] = useState('');
  const [confirm, setConfirm] = useState(null);

  const paymentQuery = useQuery({
    queryKey: ['admin', 'payment', paymentId],
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/payments/${paymentId}`);
      return payload.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ action, adminNote: note }) =>
      apiClient.patch(`/admin/payments/${paymentId}`, { action, adminNote: note || null }),
    onSuccess: (_data, variables) => {
      const messages = {
        approve: 'Payment approved — invoice, receipt, and ledger posted',
        reject: 'Payment rejected',
        clarify: 'Clarification requested',
        refund: 'Payment refunded — refund ledger entry posted',
      };
      notify.success(messages[variables.action] || 'Updated');
      setConfirm(null);
      setAdminNote('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
    },
    onError: (error) => notify.error(error.message || 'Review failed'),
  });

  if (paymentQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (paymentQuery.isError) {
    return (
      <ErrorState
        title="Unable to load payment"
        description={paymentQuery.error.message}
        onRetry={() => paymentQuery.refetch()}
      />
    );
  }

  const { payment, order, attempts, invoiceId, invoiceNumber, receiptId, receiptNumber } =
    paymentQuery.data;
  const reviewable = ['pending_verification', 'pending', 'rejected'].includes(payment.status);

  return (
    <div>
      <p className="text-sm text-muted">
        <Link to="/admin/payments" className="hover:underline">
          Payments
        </Link>
        <span aria-hidden="true"> / </span>
        {payment.orderNumber}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            Payment · {payment.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {labelStatus(payment.method)} · {formatMoney(payment.amount, payment.currency)}
          </p>
        </div>
        <Badge variant={statusVariant(payment.status)}>{labelStatus(payment.status)}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Submission</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted">Reference</dt>
                <dd className="font-medium break-all">{payment.reference || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Method</dt>
                <dd>{labelStatus(payment.method)}</dd>
              </div>
              <div>
                <dt className="text-muted">Customer note</dt>
                <dd>{payment.customerNote || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Evidence</dt>
                <dd>
                  {payment.evidenceUrl ? (
                    <a
                      href={payment.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-shield-red hover:underline break-all"
                    >
                      Open evidence URL
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Admin note</dt>
                <dd>{payment.adminNote || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Verified</dt>
                <dd>
                  {payment.verifiedAt
                    ? `${new Date(payment.verifiedAt).toLocaleString()}${
                        payment.verifiedByEmail ? ` · ${payment.verifiedByEmail}` : ''
                      }`
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Order snapshot</h2>
            <p className="mt-2 text-sm">
              <Link to={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                {order.orderNumber}
              </Link>
              <span className="text-muted"> · {labelStatus(order.status)}</span>
            </p>
            <ul className="mt-3 divide-y divide-border text-sm">
              {order.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex justify-between gap-3 py-2">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatMoney(item.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-sm font-semibold">
              Total {formatMoney(order.total, order.currency)}
            </p>
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Attempt history</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(attempts || []).map((attempt) => (
                <li key={attempt.id} className="border-b border-border pb-2 last:border-0">
                  <p className="font-medium">{labelStatus(attempt.status)}</p>
                  <p className="text-xs text-muted">
                    {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString() : ''}
                  </p>
                  {attempt.response?.adminNote ? (
                    <p className="mt-1 text-muted">{attempt.response.adminNote}</p>
                  ) : null}
                </li>
              ))}
              {!attempts?.length ? <li className="text-muted">No attempts recorded.</li> : null}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Documents</h2>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Invoice</dt>
                <dd>
                  {invoiceId ? (
                    <Link to={`/admin/invoices/${invoiceId}`} className="hover:underline">
                      {invoiceNumber}
                    </Link>
                  ) : (
                    invoiceNumber || 'Created on approve'
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Receipt</dt>
                <dd>
                  {receiptId ? (
                    <Link to={`/admin/receipts/${receiptId}`} className="hover:underline">
                      {receiptNumber}
                    </Link>
                  ) : (
                    receiptNumber || 'Created on approve'
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {canVerify && reviewable ? (
            <section className="rounded-md border border-border bg-surface p-4">
              <h2 className="font-display text-lg font-semibold text-charcoal">Review</h2>
              <Textarea
                className="mt-3"
                label="Admin note"
                rows={4}
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                hint="Required for reject / clarify"
              />
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  onClick={() =>
                    setConfirm({
                      action: 'approve',
                      title: 'Approve payment?',
                      body: 'Marks payment and order as paid, generates invoice + receipt, and posts ledger entries.',
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setConfirm({
                      action: 'clarify',
                      title: 'Request clarification?',
                      body: 'Keeps the payment pending verification and asks the customer to resubmit details.',
                    })
                  }
                >
                  Request clarification
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    setConfirm({
                      action: 'reject',
                      title: 'Reject payment?',
                      body: 'Customer can submit a new reference later. A note is required.',
                    })
                  }
                >
                  Reject
                </Button>
              </div>
            </section>
          ) : null}

          {canVerify && payment.status === 'paid' ? (
            <section className="rounded-md border border-border bg-surface p-4">
              <h2 className="font-display text-lg font-semibold text-charcoal">Refund</h2>
              <Textarea
                className="mt-3"
                label="Refund note"
                rows={3}
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
              />
              <Button
                className="mt-3"
                variant="danger"
                onClick={() =>
                  setConfirm({
                    action: 'refund',
                    title: 'Refund payment?',
                    body: 'Marks the payment refunded and posts a refund ledger entry.',
                  })
                }
              >
                Issue refund
              </Button>
            </section>
          ) : null}

          {!canVerify ? (
            <p className="text-sm text-muted">You can view payments but not verify them.</p>
          ) : null}
        </div>
      </div>

      <ConfirmationDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        confirmLabel="Confirm"
        variant={
          confirm?.action === 'reject' || confirm?.action === 'refund' ? 'danger' : 'primary'
        }
        loading={reviewMutation.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if ((confirm.action === 'reject' || confirm.action === 'clarify') && !adminNote.trim()) {
            notify.error('Add an admin note first');
            return;
          }
          reviewMutation.mutate({ action: confirm.action, adminNote: adminNote.trim() || null });
        }}
      >
        <p className="text-sm text-muted">{confirm?.body}</p>
      </ConfirmationDialog>
    </div>
  );
}
