import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { usePublicStorefront } from '@/hooks/usePublicStorefront';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';

/**
 * Public Contact — CMS intro + live business contact details from settings.
 */
export function ContactPage() {
  const storefront = usePublicStorefront();
  const contentQuery = useQuery({
    queryKey: ['content', 'public', 'contact'],
    queryFn: async () => {
      const payload = await apiClient.get('/content?page=contact');
      return payload.data.content;
    },
  });

  if (storefront.isLoading || contentQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (storefront.isError || contentQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          title="Unable to load contact page"
          description={storefront.error?.message || contentQuery.error?.message}
          onRetry={() => {
            storefront.refetch();
            contentQuery.refetch();
          }}
        />
      </div>
    );
  }

  const content = contentQuery.data || {};
  const business = storefront.data?.business || {};
  const phones = Array.isArray(business.phones) ? business.phones.filter(Boolean) : [];
  const emails = Array.isArray(business.emails) ? business.emails.filter(Boolean) : [];
  const address = business.address;
  const primaryPhone = phones[0];

  return (
    <ContentPageLayout
      title={content.title || 'Contact Us'}
      subtitle={content.intro || 'Questions about products, delivery, or orders — we are here to help.'}
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'Contact' },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-charcoal p-6 text-white sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">Call us</p>
          <p className="mt-2 font-display text-3xl font-semibold">
            {primaryPhone || '+231 778 450 169'}
          </p>
          <p className="mt-2 text-sm text-white/70">
            {[address?.line, address?.city, address?.country].filter(Boolean).join(', ') ||
              'Monrovia, Liberia'}
          </p>
        </div>

        {phones.length > 0 ? (
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-charcoal">Phone</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {phones.map((phone) => (
                <li key={phone}>
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="font-medium text-charcoal hover:text-shield-red"
                  >
                    {phone}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {business.whatsapp ? (
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-charcoal">WhatsApp</h2>
            <a
              href={`https://wa.me/${String(business.whatsapp).replace(/\D/g, '')}`}
              className="mt-3 inline-block text-sm font-medium text-shield-red hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {business.whatsapp}
            </a>
          </section>
        ) : null}

        {emails.length > 0 ? (
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-charcoal">Email</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {emails.map((email) => (
                <li key={email}>
                  <a href={`mailto:${email}`} className="text-charcoal hover:text-shield-red">
                    {email}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {business.business_hours ? (
          <section className="rounded-md border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-charcoal">Hours</h2>
            <p className="mt-3 text-sm text-muted">{business.business_hours}</p>
          </section>
        ) : null}
      </div>

      {content.form_note ? (
        <p className="mt-6 text-sm text-muted">{content.form_note}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/track-order"
          className="inline-flex rounded-md bg-shield-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-fire-red"
        >
          Track order
        </Link>
        <Link
          to="/faq"
          className="inline-flex rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-off-white"
        >
          Read FAQ
        </Link>
      </div>
    </ContentPageLayout>
  );
}
