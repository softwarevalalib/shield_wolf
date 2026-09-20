import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

/**
 * Marketo-style top utility strip — delivery / policy / account.
 */
export function TopUtilityBar({ business, className }) {
  const phone = Array.isArray(business?.phones) ? business.phones[0] : null;

  return (
    <div
      className={cn(
        'hidden border-b border-white/10 bg-charcoal text-xs text-off-white/80 sm:block',
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <li className="inline-flex items-center gap-1.5">
            <TruckIcon />
            Free delivery tips · Monrovia zones
          </li>
          <li>
            <Link to="/delivery" className="hover:text-white">
              Returns &amp; delivery
            </Link>
          </li>
          <li>
            <Link to="/track-order" className="hover:text-white">
              Track order
            </Link>
          </li>
        </ul>
        <ul className="flex items-center gap-4">
          {phone ? (
            <li>
              <a href={`tel:${phone.replace(/\s+/g, '')}`} className="hover:text-white">
                {phone}
              </a>
            </li>
          ) : null}
          <li>
            <Link to="/login" className="font-medium text-white hover:text-brand-gold">
              Login
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function AnnouncementBar({ message, active = true, className }) {
  if (!active || !message) return null;

  return (
    <div
      className={cn(
        'bg-shield-red px-4 py-2 text-center text-xs font-semibold tracking-wide text-white sm:text-sm',
        className
      )}
      role="region"
      aria-label="Announcement"
    >
      {message}
    </div>
  );
}

export function SiteLogo({ className, markOnly = false }) {
  return (
    <Link
      to="/"
      className={cn('inline-flex items-center gap-2.5 text-charcoal', className)}
      aria-label="Shield Wolf home"
    >
      <img
        src="/logo.jpeg"
        alt=""
        className="size-10 rounded-sm object-cover sm:size-11"
        width={44}
        height={44}
      />
      {markOnly ? null : (
        <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Shield Wolf
          <span className="ml-0.5 inline-block size-1.5 translate-y-[-2px] rounded-sm bg-shield-red" />
        </span>
      )}
    </Link>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7h11v10H3V7zm11 3h4l3 3v4h-7V10zM7 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
      />
    </svg>
  );
}
