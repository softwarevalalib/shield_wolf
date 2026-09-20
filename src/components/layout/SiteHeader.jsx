import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { SiteLogo } from '@/components/layout/AnnouncementBar';
import { IconButton } from '@/components/common/IconButton';
import { Drawer } from '@/components/common/Drawer';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCatalog';
import { cn } from '@/utils/cn';

const primaryLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/shop/charcoal', label: 'Charcoal' },
  { to: '/shop/red-palm-oil', label: 'Palm Oil' },
  { to: '/about', label: 'About' },
  { to: '/delivery', label: 'Delivery' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h15l-1.5 9h-12zM6 6l-1-3H2m6 16a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 21a8 8 0 10-16 0M12 11a4 4 0 100-8 4 4 0 000 8z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="11" cy="11" r="7" strokeWidth="2" />
      <path strokeWidth="2" strokeLinecap="round" d="M20 20l-3-3" />
    </svg>
  );
}

/**
 * Marketplace header — Marketo density: logo/search/cart + categories nav bar.
 */
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const { itemCount } = useCart();
  const { isAuthenticated } = useAuth();
  const categoriesQuery = useCategories();
  const categoryList = categoriesQuery.data || [];
  const searchId = useId();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    setCatsOpen(false);
    setMobileOpen(false);
    if (category) {
      navigate(`/shop/${category}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      return;
    }
    navigate(`/shop${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface shadow-soft">
      {/* Logo + search + account — Marketo top commerce row */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)}>
          <MenuIcon />
        </IconButton>

        <SiteLogo className="shrink-0" />

        <form
          onSubmit={submitSearch}
          className="hidden min-w-0 flex-1 md:flex"
          id={searchId}
        >
          <label htmlFor="store-search" className="sr-only">
            Find your product
          </label>
          <div className="relative shrink-0">
            <label htmlFor="store-search-category" className="sr-only">
              Category
            </label>
            <select
              id="store-search-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-full max-w-[9.5rem] rounded-l-md border border-r-0 border-border bg-off-white px-2 text-xs font-medium text-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-shield-red"
            >
              <option value="">All Categories</option>
              {categoryList.map((item) => (
                <option key={item.id || item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <input
            id="store-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find charcoal, palm oil, bundles…"
            className="min-w-0 flex-1 border border-border bg-surface px-3 py-2.5 text-sm text-charcoal placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-shield-red"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-r-md bg-shield-red px-4 text-sm font-semibold text-white transition-colors hover:bg-fire-red"
          >
            <SearchIcon />
            Search
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            to={isAuthenticated ? '/account' : '/login'}
            className="inline-flex size-10 items-center justify-center rounded-md text-charcoal transition-colors hover:bg-off-white hover:text-shield-red"
            aria-label={isAuthenticated ? 'Account' : 'Sign in'}
          >
            <UserIcon />
          </Link>
          <Link
            to="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-md text-charcoal transition-colors hover:bg-off-white hover:text-shield-red"
            aria-label={`Cart, ${itemCount} items`}
          >
            <CartIcon />
            {itemCount > 0 ? (
              <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-shield-red px-1 text-[10px] font-semibold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* Mobile search */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <form onSubmit={submitSearch} className="flex">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products…"
            className="min-w-0 flex-1 rounded-l-md border border-border border-r-0 px-3 py-2 text-sm"
            aria-label="Search products"
          />
          <button
            type="submit"
            className="rounded-r-md bg-shield-red px-3 text-sm font-semibold text-white"
          >
            Search
          </button>
        </form>
      </div>

      {/* Categories + primary nav — Marketo browse bar */}
      <div className="border-t border-border bg-charcoal">
        <div className="mx-auto flex max-w-7xl items-stretch gap-0 px-4 sm:px-6">
          <div className="relative shrink-0">
            <button
              type="button"
              className="flex h-full min-h-11 items-center gap-2 bg-shield-red px-3 text-sm font-semibold text-white transition-colors hover:bg-fire-red sm:px-4"
              aria-expanded={catsOpen}
              aria-controls="header-categories"
              onClick={() => setCatsOpen((open) => !open)}
            >
              <MenuIcon />
              <span className="hidden sm:inline">All Categories</span>
              <span className="sm:hidden">Categories</span>
              <span aria-hidden="true">▾</span>
            </button>
            {catsOpen ? (
              <div
                id="header-categories"
                className="absolute left-0 z-50 mt-0 w-64 overflow-hidden rounded-b-md border border-border bg-surface shadow-soft"
              >
                <ul className="max-h-72 overflow-y-auto py-1 text-sm">
                  <li>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-charcoal hover:bg-off-white hover:text-shield-red"
                      onClick={() => {
                        setCategory('');
                        setCatsOpen(false);
                        navigate('/shop');
                      }}
                    >
                      All products
                    </button>
                  </li>
                  {categoryList.map((item) => (
                    <li key={item.id || item.slug}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-charcoal hover:bg-off-white hover:text-shield-red"
                        onClick={() => {
                          setCategory(item.slug);
                          setCatsOpen(false);
                          navigate(`/shop/${item.slug}`);
                        }}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <nav aria-label="Primary" className="hidden flex-1 items-center gap-0.5 overflow-x-auto px-2 lg:flex">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white',
                    isActive && 'bg-white/10 text-white'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <p className="ml-auto hidden items-center px-3 text-xs font-medium text-brand-gold sm:flex">
            Free delivery tips · Monrovia
          </p>
        </div>
      </div>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title="Menu" side="left">
        <nav aria-label="Mobile primary" className="flex flex-col gap-1">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-base text-muted transition-colors hover:bg-off-white hover:text-charcoal',
                  isActive && 'bg-off-white font-medium text-shield-red'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </Drawer>
    </header>
  );
}
