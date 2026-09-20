import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { StatCard } from '@/components/common/StatCard';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';

const MOVEMENT_OPTIONS = [
  { value: 'addition', label: 'Addition' },
  { value: 'restock', label: 'Restock' },
  { value: 'return', label: 'Return / restock' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'sale', label: 'Sale (manual)' },
  { value: 'adjustment', label: 'Adjustment (set absolute)' },
];

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function stockBadge(status) {
  if (status === 'out') return <Badge variant="danger">Out of stock</Badge>;
  if (status === 'low') return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}

/**
 * Admin inventory dashboard — levels, movements, and stock adjustments.
 */
export function AdminInventoryPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canAdjust = hasPermission(user, 'inventory.adjust');

  const [adjustTarget, setAdjustTarget] = useState(null);
  const [movementForm, setMovementForm] = useState({
    movementType: 'addition',
    quantity: '1',
    reason: '',
    notes: '',
  });

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      status: searchParams.get('status') || 'all',
      page: Number(searchParams.get('page') || 1),
      movementsPage: Number(searchParams.get('mpage') || 1),
    }),
    [searchParams]
  );

  const inventoryQuery = useQuery({
    queryKey: ['admin', 'inventory', filters.q, filters.status, filters.page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/inventory?${params}`);
      return payload.data;
    },
  });

  const movementsQuery = useQuery({
    queryKey: ['admin', 'inventory', 'movements', filters.movementsPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(filters.movementsPage),
        pageSize: '15',
      });
      const payload = await apiClient.get(`/admin/inventory/movements?${params}`);
      return payload.data;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (body) => apiClient.post('/admin/inventory/movements', body),
    onSuccess: () => {
      notify.success('Stock movement recorded');
      setAdjustTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
    },
    onError: (error) => notify.error(error.message || 'Adjustment failed'),
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    const paramKey = key === 'movementsPage' ? 'mpage' : key;
    if (
      !value ||
      value === 'all' ||
      ((key === 'page' || key === 'movementsPage') && Number(value) === 1)
    ) {
      next.delete(paramKey);
    } else {
      next.set(paramKey, String(value));
    }
    if (key !== 'page' && key !== 'movementsPage') next.delete('page');
    setSearchParams(next);
  }

  function openAdjust(item) {
    setAdjustTarget(item);
    setMovementForm({
      movementType: 'addition',
      quantity: '1',
      reason: '',
      notes: '',
    });
  }

  if (inventoryQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (inventoryQuery.isError) {
    return (
      <ErrorState
        title="Unable to load inventory"
        description={inventoryQuery.error.message}
        onRetry={() => inventoryQuery.refetch()}
      />
    );
  }

  const { summary, items, pagination } = inventoryQuery.data;
  const movements = movementsQuery.data?.movements || [];
  const movementsPagination = movementsQuery.data?.pagination;

  const levelColumns = [
    {
      key: 'name',
      header: 'Product',
      render: (_value, row) => (
        <div>
          <Link to={`/admin/products/${row.id}`} className="font-medium hover:underline">
            {row.name}
          </Link>
          <p className="text-xs text-muted">{row.sku || 'No SKU'}</p>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category',
      render: (value) => value || '—',
    },
    {
      key: 'stockQuantity',
      header: 'Stock',
      render: (value, row) => (
        <span>
          {value}
          <span className="text-xs text-muted"> / low ≤ {row.lowStockThreshold}</span>
        </span>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Status',
      render: (value) => stockBadge(value),
    },
    {
      key: 'lineValue',
      header: 'Stock value',
      render: (value, row) => formatMoney(value, row.currency),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) =>
        canAdjust ? (
          <Button size="sm" variant="secondary" onClick={() => openAdjust(row)}>
            Adjust
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  const movementColumns = [
    {
      key: 'createdAt',
      header: 'When',
      render: (value) => (value ? new Date(value).toLocaleString() : '—'),
    },
    {
      key: 'productName',
      header: 'Product',
      render: (value, row) => (
        <div>
          <p>{value}</p>
          <p className="text-xs text-muted">{row.productSku || row.productId}</p>
        </div>
      ),
    },
    {
      key: 'movementType',
      header: 'Type',
      render: (value) => <Badge variant="neutral">{value}</Badge>,
    },
    {
      key: 'quantityDelta',
      header: 'Delta',
      render: (value) => (
        <span className={value < 0 ? 'text-danger' : 'text-success'}>
          {value > 0 ? `+${value}` : value}
        </span>
      ),
    },
    {
      key: 'quantityAfter',
      header: 'After',
    },
    {
      key: 'reason',
      header: 'Reason / note',
      render: (value) => value || '—',
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Inventory</h1>
          <p className="mt-1 text-sm text-muted">
            Stock levels and immutable movement history. Stock value uses cost price when set.
          </p>
        </div>
        <Link
          to="/admin/products"
          className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-2 text-sm text-charcoal hover:bg-off-white"
        >
          Products
        </Link>
      </div>

      {summary ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Current stock" value={summary.currentStock} hint="Units on hand" />
          <StatCard
            label="Stock value"
            value={formatMoney(summary.stockValue, summary.currency)}
            hint="Σ qty × cost"
          />
          <StatCard label="Low stock" value={summary.lowStock} hint="At or below threshold" />
          <StatCard label="Out of stock" value={summary.outOfStock} />
          <StatCard
            label="Incoming (7d)"
            value={summary.incomingStock}
            hint="Additions + restocks"
          />
          <StatCard label="Products tracked" value={summary.productCount} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Input
          label="Search"
          value={filters.q}
          onChange={(event) => updateFilter('q', event.target.value)}
          placeholder="Name or SKU"
        />
        <Select
          label="Stock status"
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'in_stock', label: 'Healthy' },
            { value: 'low', label: 'Low stock' },
            { value: 'out', label: 'Out of stock' },
          ]}
        />
      </div>

      <section className="mt-4">
        <h2 className="font-display text-lg font-semibold text-charcoal">Stock levels</h2>
        <div className="mt-2 rounded-md border border-border bg-surface">
          {items.length === 0 ? (
            <EmptyState
              title="No inventory rows"
              description="Publish products with stock to track levels here."
            />
          ) : (
            <Table columns={levelColumns} rows={items} getRowKey={(row) => row.id} />
          )}
        </div>
        {pagination?.pageCount > 1 ? (
          <Pagination
            className="mt-3"
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={(page) => updateFilter('page', page)}
          />
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-charcoal">Stock movements</h2>
        <p className="mt-1 text-sm text-muted">Append-only ledger — past rows are never edited.</p>
        <div className="mt-2 rounded-md border border-border bg-surface">
          {movementsQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : movements.length === 0 ? (
            <EmptyState
              title="No movements yet"
              description="Adjust stock or complete a sale to create history."
            />
          ) : (
            <Table columns={movementColumns} rows={movements} getRowKey={(row) => row.id} />
          )}
        </div>
        {movementsPagination?.pageCount > 1 ? (
          <Pagination
            className="mt-3"
            page={movementsPagination.page}
            pageCount={movementsPagination.pageCount}
            onPageChange={(page) => updateFilter('movementsPage', page)}
          />
        ) : null}
      </section>

      <Modal
        open={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust stock — ${adjustTarget?.name || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={adjustMutation.isPending}
              onClick={() => {
                if (!adjustTarget) return;
                adjustMutation.mutate({
                  productId: adjustTarget.id,
                  movementType: movementForm.movementType,
                  quantity: Number(movementForm.quantity),
                  reason: movementForm.reason.trim() || null,
                  notes: movementForm.notes.trim() || null,
                });
              }}
            >
              Record movement
            </Button>
          </div>
        }
      >
        {adjustTarget ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Current stock:{' '}
              <span className="font-medium text-charcoal">{adjustTarget.stockQuantity}</span>
            </p>
            <Select
              label="Movement type"
              value={movementForm.movementType}
              onChange={(event) =>
                setMovementForm((current) => ({ ...current, movementType: event.target.value }))
              }
              options={MOVEMENT_OPTIONS}
            />
            <Input
              label={
                movementForm.movementType === 'adjustment'
                  ? 'New absolute quantity'
                  : 'Quantity (units)'
              }
              type="number"
              min="0"
              step="1"
              value={movementForm.quantity}
              onChange={(event) =>
                setMovementForm((current) => ({ ...current, quantity: event.target.value }))
              }
            />
            <Input
              label="Reason"
              value={movementForm.reason}
              onChange={(event) =>
                setMovementForm((current) => ({ ...current, reason: event.target.value }))
              }
              placeholder="e.g. Warehouse count, supplier delivery"
            />
            <Textarea
              label="Notes"
              rows={3}
              value={movementForm.notes}
              onChange={(event) =>
                setMovementForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
