import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { Accordion } from '@/components/common/Accordion';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';

/**
 * Public FAQ — CMS-driven accordion items.
 */
export function FaqPage() {
  const query = useQuery({
    queryKey: ['content', 'public', 'faq'],
    queryFn: async () => {
      const payload = await apiClient.get('/content?page=faq');
      return payload.data.content;
    },
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Unable to load FAQ"
          description={query.error?.message}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  const content = query.data || {};
  const items = (content.items || []).map((item, index) => ({
    id: String(index),
    title: item.question,
    content: item.answer,
  }));

  return (
    <ContentPageLayout
      title={content.title || 'Frequently Asked Questions'}
      subtitle={content.intro || 'Quick answers about ordering, delivery, and payments.'}
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'FAQ' },
      ]}
    >
      <div className="overflow-hidden rounded-md border border-border bg-surface p-4 sm:p-6">
        {items.length === 0 ? (
          <EmptyState
            title="No questions yet"
            description="FAQ items will appear here once published in the admin CMS."
          />
        ) : (
          <Accordion items={items} />
        )}
      </div>
    </ContentPageLayout>
  );
}
