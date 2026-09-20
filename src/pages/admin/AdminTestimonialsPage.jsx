import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useNotification } from '@/contexts/NotificationContext';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Modal } from '@/components/common/Modal';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Switch } from '@/components/forms/Switch';
import { Select } from '@/components/forms/Select';

function emptyForm() {
  return {
    id: null,
    customerName: '',
    body: '',
    rating: '5',
    featured: false,
    active: true,
    sortOrder: '0',
  };
}

/**
 * Admin testimonials CMS.
 */
export function AdminTestimonialsPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const listQuery = useQuery({
    queryKey: ['admin', 'testimonials', activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: '50' });
      if (activeFilter !== 'all') params.set('active', activeFilter);
      const payload = await apiClient.get(`/admin/testimonials?${params}`);
      return payload.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const body = {
        customerName: form.customerName.trim(),
        body: form.body.trim(),
        rating: form.rating === '' ? null : Number(form.rating),
        featured: form.featured,
        active: form.active,
        sortOrder: Number(form.sortOrder || 0),
      };
      if (form.id) return apiClient.patch(`/admin/testimonials/${form.id}`, body);
      return apiClient.post('/admin/testimonials', body);
    },
    onSuccess: () => {
      notify.success(editor?.id ? 'Testimonial updated' : 'Testimonial created');
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'public'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/testimonials/${id}`),
    onSuccess: () => {
      notify.success('Testimonial removed');
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'public'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  const columns = useMemo(
    () => [
      {
        key: 'customerName',
        header: 'Customer',
        render: (_v, row) => (
          <div>
            <p className="font-medium text-charcoal">{row.customerName}</p>
            <p className="line-clamp-2 text-sm text-muted">{row.body}</p>
          </div>
        ),
      },
      {
        key: 'rating',
        header: 'Rating',
        render: (v) => (v == null ? '—' : `${v}/5`),
      },
      {
        key: 'active',
        header: 'Status',
        render: (_v, row) => (
          <div className="flex flex-wrap gap-1">
            <Badge variant={row.active ? 'success' : 'neutral'}>
              {row.active ? 'Active' : 'Hidden'}
            </Badge>
            {row.featured ? <Badge variant="accent">Featured</Badge> : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (_v, row) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setEditor({
                  id: row.id,
                  customerName: row.customerName,
                  body: row.body,
                  rating: row.rating == null ? '' : String(row.rating),
                  featured: row.featured,
                  active: row.active,
                  sortOrder: String(row.sortOrder ?? 0),
                })
              }
            >
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(row)}>
              Remove
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  if (listQuery.isLoading) {
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
        title="Unable to load testimonials"
        description={listQuery.error?.message}
        onRetry={() => listQuery.refetch()}
      />
    );
  }

  const items = listQuery.data?.items || [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">Testimonials</h1>
          <p className="mt-1 text-sm text-muted">Customer quotes shown on the homepage.</p>
        </div>
        <Button onClick={() => setEditor(emptyForm())}>Add testimonial</Button>
      </div>

      <div className="mt-4 max-w-xs">
        <Select
          label="Filter"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Hidden' },
          ]}
        />
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            title="No testimonials yet"
            description="Add customer quotes to build trust on the homepage."
            action={<Button onClick={() => setEditor(emptyForm())}>Add testimonial</Button>}
          />
        ) : (
          <Table columns={columns} rows={items} getRowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.id ? 'Edit testimonial' : 'Add testimonial'}
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
              label="Customer name"
              value={editor.customerName}
              onChange={(e) => setEditor({ ...editor, customerName: e.target.value })}
              required
            />
            <Textarea
              label="Quote"
              value={editor.body}
              onChange={(e) => setEditor({ ...editor, body: e.target.value })}
              rows={4}
              required
            />
            <Input
              label="Rating (1–5)"
              type="number"
              min="1"
              max="5"
              value={editor.rating}
              onChange={(e) => setEditor({ ...editor, rating: e.target.value })}
            />
            <Input
              label="Sort order"
              type="number"
              min="0"
              value={editor.sortOrder}
              onChange={(e) => setEditor({ ...editor, sortOrder: e.target.value })}
            />
            <Switch
              label="Active"
              checked={editor.active}
              onChange={(checked) => setEditor({ ...editor, active: checked })}
            />
            <Switch
              label="Featured"
              checked={editor.featured}
              onChange={(checked) => setEditor({ ...editor, featured: checked })}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove testimonial?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      >
        <p className="text-sm text-muted">This hides the quote from the storefront.</p>
      </ConfirmationDialog>
    </div>
  );
}
