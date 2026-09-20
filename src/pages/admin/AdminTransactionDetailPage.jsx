import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasAnyPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

/**
 * Single ledger transaction detail.
 */
export function AdminTransactionDetailPage() {
  const { transactionId } = useParams();
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canVoid = hasAnyPermission(user, ['finance.view', 'payments.verify']);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['admin', 'transaction', transactionId],
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/transactions/${transactionId}`);
      return payload.data;
    },
  });

  const voidMutation = useMutation({
    mutationFn: async () =>
      apiClient.patch(`/admin/transactions/${transactionId}`, { action: 'void' }),
    onSuccess: () => {
      notify.success('Transaction voided');
      setConfirmVoid(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    },
    onError: (error) => notify.error(error.message || 'Void failed'),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Unable to load transaction"
        description={detailQuery.error.message}
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  const { transaction } = detailQuery.data;

  return (
    <div>
      <p className="text-sm text-muted">
        <Link to="/admin/transactions" className="hover:underline">
          Transactions
        </Link>
        <span aria-hidden="true"> / </span>
        {transaction.transactionNumber}
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {transaction.transactionNumber}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted">
            {String(transaction.type).replaceAll('_', ' ')} ·{' '}
            {formatMoney(transaction.amount, transaction.currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={transaction.status === 'void' ? 'danger' : 'success'}>
            {transaction.status}
          </Badge>
          {canVoid && transaction.status !== 'void' ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirmVoid(true)}>
              Void
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-6 grid gap-3 rounded-md border border-border bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Occurred</dt>
          <dd>
            {transaction.occurredAt ? new Date(transaction.occurredAt).toLocaleString() : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Payment method</dt>
          <dd>{transaction.paymentMethod || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Order</dt>
          <dd>
            {transaction.orderId ? (
              <Link to={`/admin/orders/${transaction.orderId}`} className="hover:underline">
                {transaction.orderNumber || transaction.orderId}
              </Link>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Reference</dt>
          <dd className="break-all">{transaction.reference || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Created by</dt>
          <dd>{transaction.createdByEmail || '—'}</dd>
        </div>
      </dl>

      <ConfirmationDialog
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        title="Void transaction?"
        confirmLabel="Void"
        variant="danger"
        loading={voidMutation.isPending}
        onConfirm={() => voidMutation.mutate()}
      >
        <p className="text-sm text-muted">
          Marks the ledger entry void. Does not reverse source payments or expenses automatically.
        </p>
      </ConfirmationDialog>
    </div>
  );
}
