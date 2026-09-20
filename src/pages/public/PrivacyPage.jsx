import { Link } from 'react-router-dom';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';

export function PrivacyPage() {
  return (
    <ContentPageLayout
      title="Privacy Policy"
      subtitle="How Shield Wolf collects and uses information when you shop with us online."
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'Privacy' },
      ]}
    >
      <div className="space-y-6 overflow-hidden rounded-md border border-border bg-surface p-5 sm:p-7">
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">Information we collect</h2>
          <p className="mt-2 text-sm text-muted">
            When you create an account, place an order, or contact us, we may collect your name,
            phone number, email, delivery address, and payment confirmation details you submit.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">How we use it</h2>
          <p className="mt-2 text-sm text-muted">
            We use your information to fulfill orders, arrange delivery, verify payments, send
            order updates, and improve our storefront experience. We do not sell your personal
            information.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">Payments</h2>
          <p className="mt-2 text-sm text-muted">
            Mobile money payments (MTN MoMo / Orange Money) are processed according to the
            instructions shown at checkout. Payment evidence you upload is used only for
            verification by Shield Wolf staff.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">Contact</h2>
          <p className="mt-2 text-sm text-muted">
            Questions about privacy? Reach us via the details on our{' '}
            <Link to="/contact" className="font-medium text-shield-red hover:underline">
              Contact
            </Link>{' '}
            page.
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
