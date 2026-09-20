import { Link, NavLink } from 'react-router-dom';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { PageEnter } from '@/components/common/PageEnter';
import { cn } from '@/utils/cn';

export const HELP_NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/track-order', label: 'Track order' },
  { to: '/delivery', label: 'Delivery' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
  { to: '/about', label: 'About us' },
];

/**
 * Marketo-style page title band — charcoal strip with title + short support.
 */
export function MarketplacePageBanner({ title, subtitle, className }) {
  return (
    <div className={cn('border-b border-border bg-charcoal text-white', className)}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">{subtitle}</p> : null}
      </div>
    </div>
  );
}

/**
 * Content / help pages — breadcrumbs, optional banner, left help nav, main column.
 */
export function ContentPageLayout({
  breadcrumbItems = [],
  title,
  subtitle,
  banner = true,
  showSidebar = true,
  children,
  className,
}) {
  return (
    <PageEnter className={cn('bg-off-white', className)}>
      {banner && title ? <MarketplacePageBanner title={title} subtitle={subtitle} /> : null}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {breadcrumbItems.length ? (
          <Breadcrumb
            items={breadcrumbItems}
            className={cn(banner ? 'mb-6 [&_span]:text-charcoal [&_a]:text-muted' : 'mb-6')}
          />
        ) : null}

        {!banner && title ? (
          <div className="mb-8 max-w-2xl">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-charcoal sm:text-4xl">
              {title}
            </h1>
            {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
          </div>
        ) : null}

        <div
          className={cn(
            'grid gap-8',
            showSidebar && 'lg:grid-cols-[220px_minmax(0,1fr)]'
          )}
        >
          {showSidebar ? (
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="overflow-hidden rounded-md border border-border bg-surface">
                <p className="bg-shield-red px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
                  Quick links
                </p>
                <nav aria-label="Help pages" className="p-2">
                  <ul className="space-y-0.5 text-sm">
                    {HELP_NAV.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === '/shop'}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-md px-3 py-2 text-charcoal transition-colors hover:bg-off-white hover:text-shield-red',
                              isActive && 'bg-off-white font-semibold text-shield-red'
                            )
                          }
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="border-t border-border bg-off-white px-3 py-3 text-xs text-muted">
                  Need help?{' '}
                  <Link to="/contact" className="font-medium text-shield-red hover:underline">
                    Contact us
                  </Link>
                </div>
              </div>
            </aside>
          ) : null}

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </PageEnter>
  );
}

/**
 * Auth pages — brand panel + form card (Marketo account style).
 */
export function AuthPageLayout({ title, subtitle, children, footer }) {
  return (
    <PageEnter className="bg-off-white">
      <div className="mx-auto grid min-h-[70vh] max-w-7xl lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-charcoal text-white lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-shield-red/40 via-transparent to-brand-gold/20" />
          <div className="relative flex h-full flex-col justify-end p-10 xl:p-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold">Shield Wolf</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight">
              Premium charcoal &amp; Divine Red Palm Oil.
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/75">
              Sign in to track orders, manage deliveries, and reorder your essentials faster.
            </p>
            <ul className="mt-8 space-y-2 text-sm text-white/80">
              <li>· Live order tracking</li>
              <li>· Saved delivery details</li>
              <li>· Secure MoMo checkout</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <Breadcrumb
              className="mb-6"
              items={[
                { label: 'Home', to: '/' },
                { label: title },
              ]}
            />
            <h1 className="font-display text-3xl font-semibold text-charcoal">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
          </div>
        </div>
      </div>
    </PageEnter>
  );
}

/**
 * Compact checkout/cart progress strip.
 */
export function CheckoutSteps({ current = 'cart' }) {
  const steps = [
    { id: 'cart', label: 'Cart', to: '/cart' },
    { id: 'checkout', label: 'Checkout', to: '/checkout' },
    { id: 'done', label: 'Done' },
  ];
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
      {steps.map((step, index) => {
        const active = index === currentIndex;
        const done = index < currentIndex;
        const content = (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1',
              active && 'bg-shield-red text-white',
              done && 'bg-charcoal text-white',
              !active && !done && 'bg-off-white text-muted'
            )}
          >
            <span aria-hidden="true">{index + 1}</span>
            {step.label}
          </span>
        );
        return (
          <li key={step.id} className="inline-flex items-center gap-2">
            {index > 0 ? <span className="text-border">/</span> : null}
            {step.to && !active ? (
              <Link to={step.to} className="hover:opacity-90">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
