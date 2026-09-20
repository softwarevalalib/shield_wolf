import { Link } from 'react-router-dom';
import { MarketplacePageBanner } from '@/components/layout/MarketplacePageChrome';

export function NotFoundPage() {
  return (
    <div className="bg-off-white">
      <MarketplacePageBanner
        title="Page not found"
        subtitle="The page you requested does not exist or has been moved."
      />
      <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-wider text-shield-red">404</p>
        <h2 className="mb-3 font-display text-2xl font-semibold text-charcoal">
          We could not find that page
        </h2>
        <p className="mb-8 text-sm text-muted">
          Try the shop, track an order, or head back home.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-charcoal px-4 py-2.5 text-sm font-semibold text-white hover:bg-graphite"
          >
            Home
          </Link>
          <Link
            to="/shop"
            className="rounded-md bg-shield-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-fire-red"
          >
            Shop
          </Link>
          <Link
            to="/track-order"
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-off-white"
          >
            Track order
          </Link>
        </div>
      </section>
    </div>
  );
}
