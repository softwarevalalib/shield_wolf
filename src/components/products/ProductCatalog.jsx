import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Pagination } from '@/components/common/Pagination';
import { FilterPanel } from '@/components/common/FilterPanel';
import { Select } from '@/components/forms/Select';
import { Input } from '@/components/forms/Input';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/common/Skeleton';
import { ProductCard } from '@/components/products/ProductCard';
import { MarketplacePageBanner } from '@/components/layout/MarketplacePageChrome';
import { PageEnter } from '@/components/common/PageEnter';
import { useCatalogQuery, useCategories } from '@/hooks/useCatalog';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/utils/cn';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'best_selling', label: 'Best Selling' },
];

/**
 * Shared shop / category catalog UI.
 * Filters sync to URL query params for shareable links.
 */
export function ProductCatalog({ categorySlug = null, title, description, breadcrumbItems }) {
  const { addItem } = useCart();
  const categoriesQuery = useCategories();
  const { filters, updateFilters, resetFilters, data, isLoading, isError, refetch, isFetching } =
    useCatalogQuery({ categorySlug });

  const [draft, setDraft] = useState({
    q: filters.q,
    brand: filters.brand,
    size: filters.size,
    availability: filters.availability,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    category: filters.category,
  });

  useEffect(() => {
    setDraft({
      q: filters.q,
      brand: filters.brand,
      size: filters.size,
      availability: filters.availability,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      category: filters.category,
    });
  }, [filters]);

  const products = data?.products || [];
  const pagination = data?.pagination;
  const facets = data?.facets || { brands: [], sizes: [] };
  const categories = categoriesQuery.data || [];

  function applyFilters() {
    updateFilters({ ...draft, page: 1 });
  }

  function handleReset() {
    setDraft({
      q: '',
      brand: '',
      size: '',
      availability: '',
      minPrice: '',
      maxPrice: '',
      category: categorySlug || '',
    });
    resetFilters();
  }

  return (
    <PageEnter className="bg-off-white">
      <MarketplacePageBanner title={title} subtitle={description} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Breadcrumb items={breadcrumbItems} className="mb-5" />

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-md border border-border bg-surface">
              <p className="bg-charcoal px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white">
                Filter products
              </p>
              <div className="p-3">
                <FilterPanel
                  onApply={applyFilters}
                  onReset={handleReset}
                  className="border-0 bg-transparent p-0"
                >
            <SearchInput
              value={draft.q}
              onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
              onClear={() => setDraft((current) => ({ ...current, q: '' }))}
              placeholder="Search products, SKU…"
            />

            {!categorySlug ? (
              <Select
                label="Category"
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, category: event.target.value }))
                }
                options={[
                  { value: '', label: 'All categories' },
                  ...categories.map((category) => ({
                    value: category.slug,
                    label: category.name,
                  })),
                ]}
              />
            ) : null}

            <Select
              label="Availability"
              value={draft.availability}
              onChange={(event) =>
                setDraft((current) => ({ ...current, availability: event.target.value }))
              }
              options={[
                { value: '', label: 'Any' },
                { value: 'in_stock', label: 'In stock' },
                { value: 'out_of_stock', label: 'Out of stock' },
              ]}
            />

            <Select
              label="Brand"
              value={draft.brand}
              onChange={(event) =>
                setDraft((current) => ({ ...current, brand: event.target.value }))
              }
              options={[
                { value: '', label: 'Any brand' },
                ...facets.brands.map((brand) => ({ value: brand, label: brand })),
              ]}
            />

            <Select
              label="Size"
              value={draft.size}
              onChange={(event) =>
                setDraft((current) => ({ ...current, size: event.target.value }))
              }
              options={[
                { value: '', label: 'Any size' },
                ...facets.sizes.map((size) => ({ value: size, label: size })),
              ]}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Min price"
                type="number"
                min="0"
                inputMode="decimal"
                value={draft.minPrice}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, minPrice: event.target.value }))
                }
              />
              <Input
                label="Max price"
                type="number"
                min="0"
                inputMode="decimal"
                value={draft.maxPrice}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, maxPrice: event.target.value }))
                }
              />
            </div>
                </FilterPanel>
              </div>
            </div>

            {!categorySlug && categories.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
                <p className="bg-shield-red px-3 py-2 text-xs font-bold uppercase tracking-wider text-white">
                  Categories
                </p>
                <ul className="divide-y divide-border text-sm">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        to={`/shop/${category.slug}`}
                        className="block px-3 py-2.5 text-charcoal transition-colors hover:bg-off-white hover:text-shield-red"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
              <p className="text-sm text-muted" aria-live="polite">
                {isLoading
                  ? 'Loading products…'
                  : `Showing ${pagination?.total ?? 0} product${pagination?.total === 1 ? '' : 's'}`}
                {isFetching && !isLoading ? ' · Updating' : ''}
              </p>
              <div className="w-full sm:w-52">
                <Select
                  label="Sort"
                  value={filters.sort}
                  onChange={(event) => updateFilters({ sort: event.target.value, page: 1 })}
                  options={SORT_OPTIONS}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-80" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                title="Unable to load products"
                description="Check your connection and try again."
                onRetry={() => refetch()}
              />
            ) : products.length === 0 ? (
              <EmptyState
                title="No products match your filters"
                description="Try clearing filters or check back after products are published in the admin catalog."
                action={
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-charcoal hover:bg-off-white"
                  >
                    Reset filters
                  </button>
                }
              />
            ) : (
              <>
                <div
                  className={cn(
                    'grid gap-3 sm:grid-cols-2 xl:grid-cols-3',
                    isFetching && 'opacity-70'
                  )}
                >
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      name={product.name}
                      slug={product.slug}
                      imageUrl={product.imageUrl}
                      category={product.category}
                      size={product.size}
                      price={product.price}
                      compareAtPrice={product.compareAtPrice}
                      currency={product.currency}
                      available={product.available}
                      onAddToCart={() =>
                        addItem({
                          productId: product.id,
                          name: product.name,
                          imageUrl: product.imageUrl,
                          quantity: 1,
                          size: product.size,
                          slug: product.slug,
                        })
                      }
                    />
                  ))}
                </div>

                {pagination && pagination.pageCount > 1 ? (
                  <div className="mt-8">
                    <Pagination
                      page={pagination.page}
                      pageCount={pagination.pageCount}
                      onPageChange={(page) => updateFilters({ page })}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </PageEnter>
  );
}
