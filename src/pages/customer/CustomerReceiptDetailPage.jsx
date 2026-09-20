import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { DocumentSheet } from '@/components/documents/DocumentSheet';

/**
 * Customer receipt detail + print.
 */
export function CustomerReceiptDetailPage() {
  const { receiptId } = useParams();

  const detailQuery = useQuery({
    queryKey: ['account', 'receipt', receiptId],
    queryFn: async () => {
      const payload = await apiClient.get(`/account/receipts/${receiptId}`);
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
        title="Unable to load receipt"
        description={detailQuery.error.message}
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  const { receipt } = detailQuery.data;

  return (
    <div>
      <div className="print:hidden">
        <p className="text-sm text-muted">
          <Link to="/account/receipts" className="hover:underline">
            Receipts
          </Link>
          <span aria-hidden="true"> / </span>
          {receipt.receiptNumber}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {receipt.receiptNumber}
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
        <DocumentSheet document={receipt} variant="receipt" />
      </div>
    </div>
  );
}
