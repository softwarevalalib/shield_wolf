import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { Button } from '@/components/common/Button';
import { Drawer } from '@/components/common/Drawer';
import { SkipToContent } from '@/components/accessibility/SkipToContent';
import { cn } from '@/utils/cn';

const COLLAPSE_KEY = 'sw-admin-sidebar-collapsed';

/**
 * Admin shell — grouped sidebar, collapsible desktop rail, mobile drawer, top bar.
 */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  const brand = (
    <Link
      to="/admin"
      className={cn(
        'flex items-center gap-2 rounded-md px-1 py-1 text-white transition-colors hover:bg-graphite/50',
        collapsed && 'justify-center px-0'
      )}
      onClick={closeMobile}
    >
      <img src="/logo.jpeg" alt="" className="size-8 shrink-0 rounded object-cover" width={32} height={32} />
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight">Shield Wolf</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-brand-gold">Admin</span>
        </span>
      ) : (
        <span className="sr-only">Shield Wolf Admin</span>
      )}
    </Link>
  );

  const logoutButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mt-auto w-full text-off-white hover:bg-graphite hover:text-white"
      onClick={handleLogout}
    >
      Log out
    </Button>
  );

  return (
    <div className="flex min-h-screen bg-off-white">
      <SkipToContent />
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-graphite bg-charcoal p-3 text-off-white transition-[width] duration-200 lg:flex print:hidden',
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20',
          collapsed ? 'w-[4.25rem]' : 'w-64'
        )}
      >
        <div className={cn('mb-4', collapsed && 'px-0 text-center')}>{brand}</div>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgb(255_255_255_/_0.2)_transparent]">
          <AdminSidebar user={user} collapsed={collapsed} />
        </div>
        {logoutButton}
      </aside>

      <Drawer
        open={mobileOpen}
        onClose={closeMobile}
        title="Admin navigation"
        side="left"
        className="max-w-xs border-graphite bg-charcoal text-off-white [&_h2]:text-off-white [&_button]:text-off-white/70"
      >
        <div className="flex h-full flex-col gap-4">
          {brand}
          <AdminSidebar user={user} collapsed={false} onNavigate={closeMobile} className="flex-1" />
          {logoutButton}
        </div>
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar
          user={user}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobileNav={() => setMobileOpen(true)}
          className="print:hidden"
        />
        <main id="main-content" className="flex-1 p-4 md:p-6 print:p-0" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
