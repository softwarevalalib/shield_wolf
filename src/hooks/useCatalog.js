import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';

function buildQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

export function useCatalogQuery({ categorySlug } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      sort: searchParams.get('sort') || 'featured',
      brand: searchParams.get('brand') || '',
      size: searchParams.get('size') || '',
      availability: searchParams.get('availability') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      page: searchParams.get('page') || '1',
      category: categorySlug || searchParams.get('category') || '',
    }),
    [searchParams, categorySlug]
  );

  const queryString = useMemo(() => {
    return buildQueryString({
      q: filters.q || undefined,
      sort: filters.sort !== 'featured' ? filters.sort : undefined,
      brand: filters.brand || undefined,
      size: filters.size || undefined,
      availability: filters.availability || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      page: filters.page !== '1' ? filters.page : undefined,
      category: filters.category || undefined,
      pageSize: 12,
      facets: '1',
    });
  }, [filters]);

  const catalogQuery = useQuery({
    queryKey: ['products', 'catalog', queryString],
    queryFn: async () => {
      const path = queryString ? `/products?${queryString}` : '/products?pageSize=12&facets=1';
      const payload = await apiClient.get(path);
      return payload.data;
    },
    placeholderData: (previous) => previous,
  });

  function updateFilters(next, { replace = false } = {}) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();

    if (merged.q) params.set('q', merged.q);
    if (merged.sort && merged.sort !== 'featured') params.set('sort', merged.sort);
    if (merged.brand) params.set('brand', merged.brand);
    if (merged.size) params.set('size', merged.size);
    if (merged.availability) params.set('availability', merged.availability);
    if (merged.minPrice) params.set('minPrice', merged.minPrice);
    if (merged.maxPrice) params.set('maxPrice', merged.maxPrice);
    if (merged.page && String(merged.page) !== '1') params.set('page', String(merged.page));
    // category stays in path for /shop/:category — only set query category on /shop
    if (!categorySlug && merged.category) params.set('category', merged.category);

    setSearchParams(params, { replace });
  }

  function resetFilters() {
    setSearchParams({}, { replace: true });
  }

  return {
    filters,
    updateFilters,
    resetFilters,
    ...catalogQuery,
  };
}

export function useCategory(slug) {
  return useQuery({
    queryKey: ['categories', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const payload = await apiClient.get(`/categories?slug=${encodeURIComponent(slug)}`);
      return payload.data?.category;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'list'],
    queryFn: async () => {
      const payload = await apiClient.get('/categories');
      return payload.data?.categories || [];
    },
  });
}
