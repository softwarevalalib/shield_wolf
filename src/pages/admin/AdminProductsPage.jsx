import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { Table } from '@/components/common/Table';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function statusVariant(status) {
  if (status === 'published') return 'success';
  if (status === 'archived') return 'neutral';
  return 'warning';
}

/**
 * Admin products list — search, filter, sort, pagination, bulk actions.
 */
export function AdminProductsPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      status: searchParams.get('status') || 'all',
      categoryId: searchParams.get('categoryId') || '',
      sort: searchParams.get('sort') || 'updated_desc',
      page: Number(searchParams.get('page') || 1),
      pageSize: 20,
    }),
    [searchParams]
  );

  const canCreate = hasPermission(user, 'products.create');
  const canUpdate = hasPermission(user, 'products.update');
  const canDelete = hasPermission(user, 'products.delete');

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/categories');
      return payload.data.categories;
    },
  });

  const productsQuery = useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.sort) params.set('sort', filters.sort);
      params.set('page', String(filters.page));
      params.set('pageSize', String(filters.pageSize));
      const payload = await apiClient.get(`/admin/products?${params}`);
      return payload.data;
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }) => apiClient.patch('/admin/products', { ids, action }),
    onSuccess: () => {
      notify.success('Bulk action completed');
      setSelected([]);
      setConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (error) => notify.error(error.message || 'Bulk action failed'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id) => apiClient.post(`/admin/products/${id}`, { action: 'duplicate' }),
    onSuccess: (payload) => {
      notify.success('Product duplicated as draft');
      navigate(`/admin/products/${payload.data.product.id}`);
    },
    onError: (error) => notify.error(error.message || 'Duplicate failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => {
      notify.success('Product deleted');
      setConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || (key === 'page' && value === 1)) {
      if (key === 'page') next.delete('page');
      else next.delete(key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  function toggleSelect(id) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAll(products) {
    if (selected.length === products.length) {
      setSelected([]);
    } else {
      setSelected(products.map((product) => product.id));
    }
  }

  if (productsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (productsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load products"
        description={productsQuery.error.message}
        onRetry={() => productsQuery.refetch()}
      />
    );
  }

  const { products, pagination } = productsQuery.data;

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Select all on page"
          checked={products.length > 0 && selected.length === products.length}
          onChange={() => toggleAll(products)}
        />
      ),
      render: (_value, row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.name}`}
          checked={selected.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
        />
      ),
    },
    {
      key: 'thumbnailUrl',
      header: 'Image',
      render: (url) =>
        url ? (
          <img src={url} alt="" className="size-10 rounded object-cover" />
        ) : (
          <span className="inline-flex size-10 items-center justify-center rounded bg-off-white text-xs text-muted">
            —
          </span>
        ),
    },
    {
      key: 'name',
      header: 'Product',
      render: (_value, row) => (
        <div>
          <Link
            to={`/admin/products/${row.id}`}
            className="font-medium text-charcoal hover:underline"
          >
            {row.name}
          </Link>
          <p className="text-xs text-muted">/{row.slug}</p>
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', render: (value) => value || '—' },
    {
      key: 'categoryName',
      header: 'Category',
      render: (value) => value || '—',
    },
    {
      key: 'price',
      header: 'Price',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'costPrice',
      header: 'Cost',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'stockQuantity',
      header: 'Stock',
      render: (value, row) => (
        <span className={value <= row.lowStockThreshold ? 'text-warning' : ''}>{value}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <Badge variant={statusVariant(value)}>{value}</Badge>,
    },
    {
      key: 'salesCount',
      header: 'Sales',
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/products/${row.id}`)}>
            Edit
          </Button>
          {canCreate ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => duplicateMutation.mutate(row.id)}
              loading={duplicateMutation.isPending}
            >
              Duplicate
            </Button>
          ) : null}
          {canUpdate ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setConfirm({
                  type: 'archive',
                  ids: [row.id],
                  title: 'Archive product?',
                  body: `Archive “${row.name}”? It will leave the public catalog.`,
                })
              }
            >
              Archive
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setConfirm({
                  type: 'delete',
                  ids: [row.id],
                  title: 'Delete product?',
                  body: `Delete “${row.name}”? Only allowed if it has no order history.`,
                })
              }
            >
              Delete
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Products</h1>
          <p className="mt-1 text-sm text-muted">
            Manage catalog items. Prices and stock come from the database.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => navigate('/admin/products/new')}>Add product</Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Input
          label="Search"
          value={filters.q}
          onChange={(event) => updateFilter('q', event.target.value)}
          placeholder="Name, SKU, slug"
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
        <Select
          label="Category"
          value={filters.categoryId}
          onChange={(event) => updateFilter('categoryId', event.target.value)}
          placeholder="All categories"
          options={[
            { value: '', label: 'All categories' },
            ...(categoriesQuery.data || []).map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
        />
        <Select
          label="Sort"
          value={filters.sort}
          onChange={(event) => updateFilter('sort', event.target.value)}
          options={[
            { value: 'updated_desc', label: 'Recently updated' },
            { value: 'name_asc', label: 'Name A–Z' },
            { value: 'price_asc', label: 'Price ↑' },
            { value: 'price_desc', label: 'Price ↓' },
            { value: 'stock_asc', label: 'Stock ↑' },
            { value: 'stock_desc', label: 'Stock ↓' },
          ]}
        />
      </div>

      {selected.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span className="text-muted">{selected.length} selected</span>
          {canUpdate ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setConfirm({
                    type: 'publish',
                    ids: selected,
                    title: 'Publish selected?',
                    body: 'Published products appear in the public shop when valid.',
                  })
                }
              >
                Publish
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setConfirm({
                    type: 'draft',
                    ids: selected,
                    title: 'Move to draft?',
                    body: 'Selected products will leave the public catalog.',
                  })
                }
              >
                Draft
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setConfirm({
                    type: 'archive',
                    ids: selected,
                    title: 'Archive selected?',
                    body: 'Archived products leave the public catalog.',
                  })
                }
              >
                Archive
              </Button>
            </>
          ) : null}
          {canDelete ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                setConfirm({
                  type: 'delete',
                  ids: selected,
                  title: 'Delete selected?',
                  body: 'Only products without order history can be deleted.',
                })
              }
            >
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 rounded-md border border-border bg-surface">
        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Create your first product to populate the shop."
            action={
              canCreate ? (
                <Button onClick={() => navigate('/admin/products/new')}>Add product</Button>
              ) : null
            }
          />
        ) : (
          <Table columns={columns} rows={products} getRowKey={(row) => row.id} />
        )}
      </div>

      {pagination.pageCount > 1 ? (
        <Pagination
          className="mt-4"
          page={pagination.page}
          pageCount={pagination.pageCount}
          onPageChange={(page) => updateFilter('page', page)}
        />
      ) : null}

      <ConfirmationDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        confirmLabel="Continue"
        variant={confirm?.type === 'delete' ? 'danger' : 'primary'}
        loading={bulkMutation.isPending || deleteMutation.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'delete' && confirm.ids.length === 1) {
            deleteMutation.mutate(confirm.ids[0]);
            return;
          }
          bulkMutation.mutate({ ids: confirm.ids, action: confirm.type });
        }}
      >
        <p className="text-sm text-muted">{confirm?.body}</p>
      </ConfirmationDialog>
    </div>
  );
}
