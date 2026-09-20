import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasAnyPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { DateRangePicker } from '@/components/common/DateRangePicker';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  return `${Number(amount).toLocaleString()} ${currency}`;
}

function emptyExpense(categoryId = '') {
  return {
    id: null,
    categoryId,
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: '',
    reference: '',
    receiptUrl: '',
  };
}

/**
 * Admin expenses — record operating costs with ledger posting.
 */
export function AdminExpensesPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canCreate = hasAnyPermission(user, ['expenses.create', 'expenses.manage']);
  const canManage = hasAnyPermission(user, ['expenses.manage']);

  const [searchParams, setSearchParams] = useSearchParams();
  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      categoryId: searchParams.get('categoryId') || 'all',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams]
  );

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'expense-categories'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/expenses?view=categories');
      return payload.data.categories;
    },
  });

  const listQuery = useQuery({
    queryKey: ['admin', 'expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      params.set('categoryId', filters.categoryId);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      params.set('page', String(filters.page));
      params.set('pageSize', '20');
      const payload = await apiClient.get(`/admin/expenses?${params}`);
      return payload.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const body = {
        categoryId: form.categoryId,
        description: form.description.trim(),
        amount: Number(form.amount),
        expenseDate: form.expenseDate || null,
        paymentMethod: form.paymentMethod.trim() || null,
        reference: form.reference.trim() || null,
        receiptUrl: form.receiptUrl.trim() || null,
      };
      if (form.id) return apiClient.patch(`/admin/expenses/${form.id}`, body);
      return apiClient.post('/admin/expenses', body);
    },
    onSuccess: () => {
      notify.success(editor?.id ? 'Expense updated' : 'Expense recorded');
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/expenses/${id}`),
    onSuccess: () => {
      notify.success('Expense removed');
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (
      !value ||
      (key === 'categoryId' && value === 'all') ||
      (key === 'page' && Number(value) === 1)
    ) {
      next.delete(key === 'page' ? 'page' : key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  if (listQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        title="Unable to load expenses"
        description={listQuery.error.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const { expenses, pagination, totals } = listQuery.data;
  const categories = categoriesQuery.data || [];
  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const columns = [
    {
      key: 'expenseDate',
      header: 'Date',
      render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    { key: 'categoryName', header: 'Category' },
    { key: 'description', header: 'Description' },
    {
      key: 'amount',
      header: 'Amount',
      render: (v, row) => formatMoney(v, row.currency),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      render: (v) => v || '—',
    },
    {
      key: 'actions',
      header: '',
      render: (_v, row) =>
        canCreate ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setEditor({
                  id: row.id,
                  categoryId: row.categoryId,
                  description: row.description,
                  amount: String(row.amount),
                  expenseDate: row.expenseDate
                    ? new Date(row.expenseDate).toISOString().slice(0, 10)
                    : '',
                  paymentMethod: row.paymentMethod || '',
                  reference: row.reference || '',
                  receiptUrl: row.receiptUrl || '',
                })
              }
            >
              Edit
            </Button>
            {canManage ? (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(row)}>
                Remove
              </Button>
            ) : null}
          </div>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Expenses</h1>
          <p className="mt-1 text-sm text-muted">
            Operating costs post to the transaction ledger and finance dashboard.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setEditor(emptyExpense(categories[0]?.id || ''))}>
            Add expense
          </Button>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-medium text-charcoal">
        Filtered total: {formatMoney(totals?.amount)}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="min-w-[180px] flex-1">
          <Input
            label="Search"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Description, reference…"
          />
        </div>
        <div className="w-48">
          <Select
            label="Category"
            value={filters.categoryId}
            onChange={(e) => updateFilter('categoryId', e.target.value)}
            options={categoryOptions}
          />
        </div>
        <DateRangePicker
          className="min-w-[280px]"
          startDate={filters.from}
          endDate={filters.to}
          onChange={({ startDate, endDate }) => {
            const next = new URLSearchParams(searchParams);
            if (startDate) next.set('from', startDate);
            else next.delete('from');
            if (endDate) next.set('to', endDate);
            else next.delete('to');
            next.delete('page');
            setSearchParams(next);
          }}
        />
      </div>

      <div className="mt-4">
        {expenses?.length ? (
          <Table columns={columns} rows={expenses} getRowKey={(row) => row.id} />
        ) : (
          <EmptyState
            title="No expenses"
            description="Record fuel, packaging, staff, and other operating costs."
          />
        )}
      </div>

      {pagination?.pageCount > 1 ? (
        <div className="mt-4">
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={(page) => updateFilter('page', page)}
          />
        </div>
      ) : null}

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.id ? 'Edit expense' : 'New expense'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button
              loading={saveMutation.isPending}
              onClick={() => editor && saveMutation.mutate(editor)}
            >
              Save
            </Button>
          </div>
        }
      >
        {editor ? (
          <div className="space-y-3">
            <Select
              label="Category"
              required
              value={editor.categoryId}
              onChange={(e) => setEditor({ ...editor, categoryId: e.target.value })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Textarea
              label="Description"
              required
              rows={2}
              value={editor.description}
              onChange={(e) => setEditor({ ...editor, description: e.target.value })}
            />
            <Input
              label="Amount"
              type="number"
              min="0"
              step="1"
              required
              value={editor.amount}
              onChange={(e) => setEditor({ ...editor, amount: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={editor.expenseDate}
              onChange={(e) => setEditor({ ...editor, expenseDate: e.target.value })}
            />
            <Input
              label="Payment method"
              value={editor.paymentMethod}
              onChange={(e) => setEditor({ ...editor, paymentMethod: e.target.value })}
              placeholder="Cash, MoMo…"
            />
            <Input
              label="Reference"
              value={editor.reference}
              onChange={(e) => setEditor({ ...editor, reference: e.target.value })}
            />
            <Input
              label="Receipt URL"
              value={editor.receiptUrl}
              onChange={(e) => setEditor({ ...editor, receiptUrl: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove expense?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      >
        <p className="text-sm text-muted">
          Soft-deletes the expense and voids related ledger entries.
        </p>
      </ConfirmationDialog>
    </div>
  );
}
