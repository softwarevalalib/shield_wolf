import { Link } from 'react-router-dom';
import { ContentPageLayout } from '@/components/layout/MarketplacePageChrome';

export function TermsPage() {
  return (
    <ContentPageLayout
      title="Terms of Service"
      subtitle="By using the Shield Wolf storefront you agree to these terms for ordering and delivery."
      breadcrumbItems={[
        { label: 'Home', to: '/' },
        { label: 'Terms' },
      ]}
    >
      <div className="space-y-6 overflow-hidden rounded-md border border-border bg-surface p-5 sm:p-7">
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">Orders &amp; pricing</h2>
          <p className="mt-2 text-sm text-muted">
            Product prices, delivery fees, and availability are confirmed at checkout. Shield Wolf
            may update catalog pricing and stock without prior notice. Orders are accepted when
            payment is verified and inventory is available.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">Delivery</h2>
          <p className="mt-2 text-sm text-muted">
            Delivery is available within published zones. Estimated times are guidance only and
            may vary with traffic, weather, and rider availability. You are responsible for
            providing an accurate delivery address and reachable phone number.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">Payments</h2>
          <p className="mt-2 text-sm text-muted">
            Unless otherwise stated, orders require payment via the methods offered at checkout.
            Fraudulent or incomplete payment submissions may delay or cancel fulfillment.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal">Questions</h2>
          <p className="mt-2 text-sm text-muted">
            For help with an order, visit{' '}
            <Link to="/track-order" className="font-medium text-shield-red hover:underline">
              Track Order
            </Link>{' '}
            or{' '}
            <Link to="/contact" className="font-medium text-shield-red hover:underline">
              Contact us
            </Link>
            .
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
