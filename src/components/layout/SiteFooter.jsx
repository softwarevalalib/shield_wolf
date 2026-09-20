import { Link } from 'react-router-dom';
import { SiteLogo } from '@/components/layout/AnnouncementBar';

function formatList(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  return values.filter(Boolean);
}

/**
 * Dense marketplace footer — contact-forward, quick links, payments note.
 */
export function SiteFooter({ business }) {
  const phones = formatList(business?.phones);
  const emails = formatList(business?.emails);
  const address = business?.address;
  const whatsapp = business?.whatsapp;
  const primaryPhone = phones[0];

  return (
    <footer className="mt-auto border-t border-border bg-charcoal text-off-white">
      <div className="border-b border-white/10 bg-graphite/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
              Got a question? Call us
            </p>
            <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
              {primaryPhone || '+231 778 450 169'}
            </p>
            <p className="mt-1 text-sm text-off-white/70">
              {[address?.line, address?.city, address?.country].filter(Boolean).join(', ') ||
                'Monrovia, Liberia'}
            </p>
          </div>
          <div className="text-sm text-off-white/75">
            <p className="font-semibold text-white">We use safe payments</p>
            <p className="mt-1">MTN MoMo · Orange Money · Manual verification</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <SiteLogo className="text-off-white [&_span]:text-off-white" />
          <p className="mt-4 max-w-xs text-sm text-off-white/75">
            Premium charcoal, Divine Red Palm Oil, and reliable delivery across Liberia.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">
            Quick links
          </h2>
          <ul className="space-y-2 text-sm text-off-white/75">
            {[
              ['/shop', 'Shop'],
              ['/delivery', 'Shipping & delivery'],
              ['/track-order', 'Track order'],
              ['/faq', 'FAQs'],
              ['/about', 'About us'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="transition-colors hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">
            Contact
          </h2>
          <ul className="space-y-2 text-sm text-off-white/75">
            {phones.map((phone) => (
              <li key={phone}>
                <a href={`tel:${phone.replace(/\s+/g, '')}`} className="hover:text-white">
                  {phone}
                </a>
              </li>
            ))}
            {whatsapp ? (
              <li>
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                  className="hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp {whatsapp}
                </a>
              </li>
            ) : null}
            {emails.map((email) => (
              <li key={email}>
                <a href={`mailto:${email}`} className="hover:text-white">
                  {email}
                </a>
              </li>
            ))}
            {!phones.length && !emails.length ? (
              <li>Contact details appear once configured in settings.</li>
            ) : null}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">
            Support
          </h2>
          <ul className="space-y-2 text-sm text-off-white/75">
            <li>
              <Link to="/privacy" className="hover:text-white">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-white">
                Terms &amp; conditions
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">
                Help center
              </Link>
            </li>
          </ul>
          {business?.business_hours ? (
            <p className="mt-4 text-sm text-off-white/75">{business.business_hours}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-off-white/60">
        &copy; {new Date().getFullYear()} {business?.business_name || 'Shield Wolf'}. All rights
        reserved.
      </div>
    </footer>
  );
}
