import { Outlet } from 'react-router-dom';
import { AnnouncementBar, TopUtilityBar } from '@/components/layout/AnnouncementBar';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SkipToContent } from '@/components/accessibility/SkipToContent';
import { usePublicStorefront } from '@/hooks/usePublicStorefront';

/**
 * Public storefront shell — Marketo-style utility + header + footer.
 */
export function PublicLayout() {
  const { data } = usePublicStorefront();
  const site = data?.site;
  const business = data?.business;

  return (
    <div className="flex min-h-screen flex-col bg-off-white">
      <SkipToContent />
      <TopUtilityBar business={business} />
      <AnnouncementBar
        message={site?.announcement_message}
        active={site?.announcement_active !== false}
      />
      <SiteHeader />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter business={business} />
    </div>
  );
}
