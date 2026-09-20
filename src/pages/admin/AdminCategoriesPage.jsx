import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Modal } from '@/components/common/Modal';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { Switch } from '@/components/forms/Switch';

function emptyCategory() {
  return {
    id: null,
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    parentId: '',
    sortOrder: '0',
    active: true,
  };
}

/**
 * Admin category management — list + create/edit modal.
 */
export function AdminCategoriesPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canManage = hasPermission(user, 'categories.manage');

  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/categories');
      return payload.data.categories;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        parentId: form.parentId || null,
        sortOrder: Number(form.sortOrder || 0),
        active: Boolean(form.active),
      };
      if (form.id) {
        return apiClient.patch(`/admin/categories/${form.id}`, payload);
      }
      return apiClient.post('/admin/categories', payload);
    },
    onSuccess: () => {
      notify.success(editor?.id ? 'Category updated' : 'Category created');
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      notify.success('Category deleted');
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  if (categoriesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load categories"
        description={categoriesQuery.error.message}
        onRetry={() => categoriesQuery.refetch()}
      />
    );
  }

  const categories = categoriesQuery.data || [];
  const parentOptions = categories
    .filter((category) => category.id !== editor?.id)
    .map((category) => ({ value: category.id, label: category.name }));

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug', render: (value) => `/${value}` },
    {
      key: 'productCount',
      header: 'Products',
    },
    {
      key: 'sortOrder',
      header: 'Sort',
    },
    {
      key: 'active',
      header: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'neutral'}>{value ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value, row) =>
        canManage ? (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setEditor({
                  id: row.id,
                  name: row.name,
                  slug: row.slug,
                  description: row.description || '',
                  imageUrl: row.imageUrl || '',
                  parentId: row.parentId || '',
                  sortOrder: String(row.sortOrder ?? 0),
                  active: Boolean(row.active),
                })
              }
            >
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(row)}>
              Delete
            </Button>
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
          <h1 className="font-display text-2xl font-semibold text-charcoal">Categories</h1>
          <p className="mt-1 text-sm text-muted">
            Organize products for the shop and admin filters.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setEditor(emptyCategory())}>Add category</Button>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface">
        {categories.length === 0 ? (
          <EmptyState
            title="No categories"
            description="Seeded categories should appear after db:seed. You can also create new ones."
            action={
              canManage ? (
                <Button onClick={() => setEditor(emptyCategory())}>Add category</Button>
              ) : null
            }
          />
        ) : (
          <Table columns={columns} rows={categories} getRowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.id ? 'Edit category' : 'New category'}
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
            <Input
              label="Name"
              required
              value={editor.name}
              onChange={(event) => setEditor({ ...editor, name: event.target.value })}
            />
            <Input
              label="Slug"
              hint="Leave blank to auto-generate"
              value={editor.slug}
              onChange={(event) => setEditor({ ...editor, slug: event.target.value })}
            />
            <Textarea
              label="Description"
              rows={3}
              value={editor.description}
              onChange={(event) => setEditor({ ...editor, description: event.target.value })}
            />
            <Input
              label="Image URL"
              value={editor.imageUrl}
              onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value })}
            />
            <Select
              label="Parent category"
              value={editor.parentId}
              onChange={(event) => setEditor({ ...editor, parentId: event.target.value })}
              options={[{ value: '', label: 'None' }, ...parentOptions]}
            />
            <Input
              label="Sort order"
              type="number"
              min="0"
              value={editor.sortOrder}
              onChange={(event) => setEditor({ ...editor, sortOrder: event.target.value })}
            />
            <Switch
              label="Active"
              checked={editor.active}
              onChange={(value) => setEditor({ ...editor, active: value })}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete category?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      >
        <p className="text-sm text-muted">
          Delete “{confirmDelete?.name}”? Only allowed when it has no products.
        </p>
      </ConfirmationDialog>
    </div>
  );
}
