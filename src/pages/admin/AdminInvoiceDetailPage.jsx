import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasAnyPermission } from '@/utils/permissions';
import { Button } from '@/components/common/Button';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { DocumentSheet } from '@/components/documents/DocumentSheet';
import { useState } from 'react';

/**
 * Admin invoice detail — preview, print, void.
 */
export function AdminInvoiceDetailPage() {
  const { invoiceId } = useParams();
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canVoid = hasAnyPermission(user, ['finance.view', 'payments.verify']);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['admin', 'invoice', invoiceId],
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/invoices/${invoiceId}`);
      return payload.data;
    },
  });

  const voidMutation = useMutation({
    mutationFn: async () => apiClient.patch(`/admin/invoices/${invoiceId}`, { action: 'void' }),
    onSuccess: () => {
      notify.success('Invoice voided');
      setConfirmVoid(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] });
    },
    onError: (error) => notify.error(error.message || 'Void failed'),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Unable to load invoice"
        description={detailQuery.error.message}
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  const { invoice, linkedReceipts } = detailQuery.data;

  return (
    <div>
      <div className="print:hidden">
        <p className="text-sm text-muted">
          <Link to="/admin/invoices" className="hover:underline">
            Invoices
          </Link>
          <span aria-hidden="true"> / </span>
          {invoice.invoiceNumber}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {invoice.invoiceNumber}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Print / PDF
            </Button>
            {canVoid && invoice.status !== 'void' ? (
              <Button variant="ghost" size="sm" onClick={() => setConfirmVoid(true)}>
                Void
              </Button>
            ) : null}
          </div>
        </div>
        {linkedReceipts?.length ? (
          <p className="mt-2 text-sm text-muted">
            Linked receipts:{' '}
            {linkedReceipts.map((r, i) => (
              <span key={r.id}>
                {i > 0 ? ', ' : ''}
                <Link to={`/admin/receipts/${r.id}`} className="hover:underline">
                  {r.receiptNumber}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">
          Use Print → Save as PDF in your browser to download a PDF copy.
        </p>
      </div>

      <div className="mt-6">
        <DocumentSheet document={invoice} variant="invoice" />
      </div>

      <ConfirmationDialog
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        title="Void invoice?"
        confirmLabel="Void"
        variant="danger"
        loading={voidMutation.isPending}
        onConfirm={() => voidMutation.mutate()}
      >
        <p className="text-sm text-muted">
          Voiding marks {invoice.invoiceNumber} as void. This does not reverse payments.
        </p>
      </ConfirmationDialog>
    </div>
  );
}
