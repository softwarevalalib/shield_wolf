import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { SkipToContent } from '@/components/accessibility/SkipToContent';

const customerLinks = [
  { to: '/account', label: 'Overview', end: true },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/deliveries', label: 'Deliveries' },
  { to: '/account/notifications', label: 'Notifications' },
  { to: '/account/invoices', label: 'Invoices' },
  { to: '/account/receipts', label: 'Receipts' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/profile', label: 'Profile' },
  { to: '/account/security', label: 'Security' },
];

/**
 * Customer portal shell.
 */
export function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName =
    user?.customerProfile?.firstName ||
    user?.adminProfile?.displayName ||
    user?.email ||
    'Customer';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SkipToContent />
      <aside className="border-b border-border bg-surface p-4 md:w-56 md:border-b-0 md:border-r print:hidden">
        <Link to="/" className="mb-4 block text-sm font-semibold text-charcoal">
          Shield Wolf
        </Link>
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">My Account</p>
        <p className="mb-3 truncate text-sm text-charcoal">{displayName}</p>
        <nav aria-label="Account" className="flex flex-col gap-1">
          {customerLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-2 py-1.5 text-sm ${
                  isActive
                    ? 'bg-off-white font-medium text-charcoal'
                    : 'text-muted hover:text-charcoal'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
          onClick={handleLogout}
        >
          Log out
        </Button>
      </aside>
      <main id="main-content" className="flex-1 p-4 md:p-6 print:p-0" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
