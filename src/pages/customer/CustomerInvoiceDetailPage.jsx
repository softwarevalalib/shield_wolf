import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { DocumentSheet } from '@/components/documents/DocumentSheet';

/**
 * Customer invoice detail + print.
 */
export function CustomerInvoiceDetailPage() {
  const { invoiceId } = useParams();

  const detailQuery = useQuery({
    queryKey: ['account', 'invoice', invoiceId],
    queryFn: async () => {
      const payload = await apiClient.get(`/account/invoices/${invoiceId}`);
      return payload.data;
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
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

  const { invoice } = detailQuery.data;

  return (
    <div>
      <div className="print:hidden">
        <p className="text-sm text-muted">
          <Link to="/account/invoices" className="hover:underline">
            Invoices
          </Link>
          <span aria-hidden="true"> / </span>
          {invoice.invoiceNumber}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {invoice.invoiceNumber}
          </h1>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Use Print → Save as PDF in your browser to download.
        </p>
      </div>
      <div className="mt-6">
        <DocumentSheet document={invoice} variant="invoice" />
      </div>
    </div>
  );
}
