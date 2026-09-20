import { Link } from 'react-router-dom';

/**
 * Phase 1 landing — architecture status only.
 * No mock products, prices, or promotional business content.
 */
export function FoundationHomePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Phase 1</p>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-charcoal">Shield Wolf</h1>
      <p className="mb-6 text-muted">
        E-Commerce &amp; Delivery Management Platform foundation is initialized. Public storefront,
        catalog, cart, checkout, and admin features will be built in subsequent phases.
      </p>
      <ul className="mb-8 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>React + Vite + Tailwind routing shell</li>
        <li>API / server / database directory architecture</li>
        <li>Auth, error, loading, and notification foundations</li>
        <li>Environment + Vercel configuration</li>
      </ul>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/shop" className="rounded-md bg-charcoal px-4 py-2 text-white">
          Shop route
        </Link>
        <Link
          to="/admin"
          className="rounded-md border border-border bg-surface px-4 py-2 text-charcoal"
        >
          Admin route
        </Link>
      </div>
    </section>
  );
}
