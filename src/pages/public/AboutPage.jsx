import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';
import aboutImage from '@/assets/brand/product.jpeg';

/**
 * Public About page — CMS-driven mission / vision / body.
 */
export function AboutPage() {
  const query = useQuery({
    queryKey: ['content', 'public', 'about'],
    queryFn: async () => {
      const payload = await apiClient.get('/content?page=about');
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
          title="Unable to load about page"
          description={query.error?.message}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  const content = query.data || {};
  const hasContent = content.intro || content.mission || content.vision || content.body;

  return (
    <ContentPageLayout
      title={content.title || 'About Shield Wolf'}
      subtitle="Premium charcoal, Divine Red Palm Oil, and reliable delivery across Liberia."
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'About' },
      ]}
    >
      <div className="grid gap-8 overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-2">
        <img src={aboutImage} alt="" className="aspect-[4/3] w-full object-cover lg:aspect-auto lg:min-h-full" />
        <div className="p-5 sm:p-7">
          {!hasContent ? (
            <EmptyState
              title="Content coming soon"
              description="About page copy will appear here once published in the admin CMS."
            />
          ) : (
            <div className="space-y-6 text-base leading-relaxed text-charcoal/90">
              {content.intro ? <p className="text-lg text-muted">{content.intro}</p> : null}
              {content.mission ? (
                <section className="border-l-2 border-brand-gold pl-4">
                  <h2 className="font-display text-xl font-semibold text-charcoal">Mission</h2>
                  <p className="mt-2 text-sm text-muted">{content.mission}</p>
                </section>
              ) : null}
              {content.vision ? (
                <section className="border-l-2 border-shield-red/70 pl-4">
                  <h2 className="font-display text-xl font-semibold text-charcoal">Vision</h2>
                  <p className="mt-2 text-sm text-muted">{content.vision}</p>
                </section>
              ) : null}
              {content.body ? <p className="text-sm text-muted">{content.body}</p> : null}
              <Link
                to="/shop"
                className="inline-flex rounded-md bg-shield-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-fire-red"
              >
                Shop products
              </Link>
            </div>
          )}
        </div>
      </div>
    </ContentPageLayout>
  );
}
