import { Link } from 'react-router-dom';

const LINKS = [
  {
    to: '/admin/settings/business',
    title: 'Business',
    body: 'Name, phones, WhatsApp, emails, address, hours, branding, invoice/receipt footers.',
  },
  {
    to: '/admin/settings/store',
    title: 'Store',
    body: 'Storefront flags, guest checkout, minimum order, default currency.',
  },
  {
    to: '/admin/settings/payments',
    title: 'Payments',
    body: 'MoMo numbers and customer-facing payment instructions (never store PIN/OTP).',
  },
  {
    to: '/admin/settings/delivery',
    title: 'Delivery',
    body: 'Global delivery notes and free-delivery threshold. Zones stay under Delivery.',
  },
  {
    to: '/admin/settings/tax',
    title: 'Tax',
    body: 'Enable tax and set the rate used in cart totals.',
  },
  {
    to: '/admin/settings/email',
    title: 'Email',
    body: 'Sender defaults for order and payment notifications.',
  },
  {
    to: '/admin/settings/security',
    title: 'Security',
    body: 'Password and session policy flags.',
  },
  {
    to: '/admin/settings/integrations',
    title: 'Integrations',
    body: 'WhatsApp, maps, and analytics identifiers.',
  },
];

/**
 * Settings hub — configure business without code deploys.
 */
export function AdminSettingsHubPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Business configuration is stored in the database and applied across the storefront.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {LINKS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="block rounded-md border border-border bg-surface p-4 hover:border-charcoal/30"
            >
              <p className="font-medium text-charcoal">{item.title}</p>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
