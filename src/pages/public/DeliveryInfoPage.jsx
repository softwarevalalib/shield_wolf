import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';

/**
 * Public Delivery info — CMS-driven page (zone fees apply at checkout).
 */
export function DeliveryInfoPage() {
  const query = useQuery({
    queryKey: ['content', 'public', 'delivery'],
    queryFn: async () => {
      const payload = await apiClient.get('/content?page=delivery');
      return payload.data.content;
    },
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Unable to load delivery information"
          description={query.error?.message}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  const content = query.data || {};
  const hasContent = content.intro || content.body || content.notes;

  return (
    <ContentPageLayout
      title={content.title || 'Delivery Information'}
      subtitle="Clear Monrovia zone fees — calculated at checkout before you pay."
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'Delivery' },
      ]}
    >
      <div className="overflow-hidden rounded-md border border-border bg-surface p-5 sm:p-7">
        {!hasContent ? (
          <EmptyState
            title="Delivery details coming soon"
            description="Delivery information will appear here once published in the admin CMS."
          />
        ) : (
          <div className="space-y-5 text-base leading-relaxed text-charcoal/90">
            {content.intro ? <p>{content.intro}</p> : null}
            {content.body ? <p className="whitespace-pre-line text-sm text-muted">{content.body}</p> : null}
            {content.notes ? (
              <p className="rounded-md border border-brand-gold/40 bg-off-white px-4 py-3 text-sm text-muted">
                {content.notes}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center rounded-md bg-shield-red px-5 py-2.5 text-sm font-medium text-white hover:bg-fire-red"
          >
            Shop now
          </Link>
          <Link
            to="/track-order"
            className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-off-white"
          >
            Track order
          </Link>
        </div>
      </div>
    </ContentPageLayout>
  );
}
