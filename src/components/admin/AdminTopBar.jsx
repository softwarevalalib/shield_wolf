import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/common/Button';
import { Dropdown } from '@/components/common/Dropdown';
import { ADMIN_NAV_GROUPS, ADMIN_QUICK_ACTIONS } from '@/config/adminNav';
import { hasAnyPermission } from '@/utils/permissions';
import { cn } from '@/utils/cn';
import { apiClient } from '@/services/apiClient';

function findNavLabel(pathname) {
  let best = null;
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.to === pathname || (item.to !== '/admin' && pathname.startsWith(`${item.to}/`))) {
        if (!best || item.to.length > best.to.length) {
          best = { group: group.label, item: item.label, to: item.to };
        }
      }
    }
  }
  return best;
}

/**
 * Admin top bar: breadcrumbs, search stub, quick actions, notifications, profile.
 */
export function AdminTopBar({ user, onToggleSidebar, onOpenMobileNav, collapsed, className }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const crumb = useMemo(() => findNavLabel(location.pathname), [location.pathname]);
  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Admin', to: '/admin' }];
    if (crumb && crumb.to !== '/admin') {
      items.push({ label: crumb.group });
      items.push({ label: crumb.item });
    } else if (location.pathname === '/admin') {
      items.push({ label: 'Dashboard' });
    }
    return items;
  }, [crumb, location.pathname]);

  const quickActions = ADMIN_QUICK_ACTIONS.filter((action) =>
    hasAnyPermission(user, action.permissions)
  );

  const displayName =
    user?.adminProfile?.displayName || user?.customerProfile?.firstName || user?.email || 'Staff';

  const notifQuery = useQuery({
    queryKey: ['notifications', 'admin-topbar'],
    enabled: Boolean(user?.id),
    refetchInterval: 60_000,
    queryFn: async () => {
      const payload = await apiClient.get('/notifications?page=1&pageSize=8');
      return payload.data;
    },
  });

  const markMutation = useMutation({
    mutationFn: async ({ action, id }) => apiClient.patch('/notifications', { action, id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifQuery.data?.unreadCount || 0;
  const recent = notifQuery.data?.items || [];

  function handleSearch(event) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/admin/products?q=${encodeURIComponent(q)}`);
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-charcoal lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMobileNav}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ≡
          </span>
        </button>
        <button
          type="button"
          className="hidden size-9 items-center justify-center rounded-md border border-border text-charcoal lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleSidebar}
        >
          <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
        </button>

        <Breadcrumb items={breadcrumbItems} className="min-w-0 flex-1" />

        <form
          onSubmit={handleSearch}
          className="order-last w-full md:order-none md:w-auto md:max-w-xs md:flex-1"
        >
          <label htmlFor="admin-global-search" className="sr-only">
            Search admin
          </label>
          <input
            id="admin-global-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, orders…"
            className="w-full rounded-md border border-border bg-off-white px-3 py-2 text-sm text-charcoal placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shield-red"
          />
        </form>

        {quickActions.length ? (
          <Dropdown
            trigger="Quick actions"
            align="right"
            items={quickActions.map((action) => ({
              label: action.label,
              to: action.to,
            }))}
          />
        ) : null}

        <div className="relative">
          <button
            type="button"
            className="relative inline-flex size-9 items-center justify-center rounded-md border border-border text-xs font-medium text-charcoal"
            aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((open) => !open)}
          >
            Alerts
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-shield-red px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>
          {notifOpen ? (
            <div className="absolute right-0 z-30 mt-2 w-80 rounded-md border border-border bg-surface p-3 text-sm shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-charcoal">Notifications</p>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="text-xs text-muted underline"
                    onClick={() => markMutation.mutate({ action: 'read_all' })}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                {recent.length === 0 ? (
                  <li className="text-muted">No alerts yet.</li>
                ) : (
                  recent.map((item) => {
                    const unread = item.status !== 'read' && !item.readAt;
                    return (
                      <li key={item.id} className="rounded-md border border-border/70 px-2 py-2">
                        <p
                          className={`text-sm ${unread ? 'font-medium text-charcoal' : 'text-charcoal'}`}
                        >
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.body}</p>
                        {unread ? (
                          <button
                            type="button"
                            className="mt-1 text-xs text-muted underline"
                            onClick={() => markMutation.mutate({ action: 'read', id: item.id })}
                          >
                            Mark read
                          </button>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Link
                  to="/admin/notifications"
                  className="text-xs font-medium text-charcoal underline"
                  onClick={() => setNotifOpen(false)}
                >
                  View all
                </Link>
                <Button type="button" size="sm" variant="ghost" onClick={() => setNotifOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-charcoal">{displayName}</p>
            <p className="truncate text-[11px] uppercase tracking-wide text-muted">
              {(user?.roles || []).slice(0, 2).join(' · ') || 'staff'}
            </p>
          </div>
          <Link
            to="/admin/settings"
            className="inline-flex size-9 items-center justify-center rounded-full bg-charcoal text-xs font-semibold text-white"
            aria-label="Admin profile / settings"
          >
            {String(displayName).slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
