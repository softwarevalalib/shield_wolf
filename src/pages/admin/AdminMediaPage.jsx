import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/common/Button';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { Modal } from '@/components/common/Modal';
import { Table } from '@/components/common/Table';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';

/**
 * Media library — register external image URLs (binary upload providers stay abstracted).
 */
export function AdminMediaPage() {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [q, setQ] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin', 'media', q],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: '40' });
      if (q.trim()) params.set('q', q.trim());
      const payload = await apiClient.get(`/admin/media?${params}`);
      return payload.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form) =>
      apiClient.post('/admin/media', {
        url: form.url.trim(),
        altText: form.altText.trim() || null,
        publicId: form.publicId.trim() || null,
        mimeType: form.mimeType.trim() || null,
      }),
    onSuccess: () => {
      notify.success('Media registered');
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/media/${id}`),
    onSuccess: () => {
      notify.success('Media removed');
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  const columns = useMemo(
    () => [
      {
        key: 'url',
        header: 'Media',
        render: (_v, row) => (
          <div className="flex items-center gap-3">
            <img
              src={row.url}
              alt={row.altText || ''}
              className="size-12 rounded object-cover bg-off-white"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-charcoal">
                {row.altText || 'Untitled'}
              </p>
              <p className="truncate text-xs text-muted">{row.url}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'provider',
        header: 'Provider',
        render: (v) => v || '—',
      },
      {
        key: 'actions',
        header: '',
        render: (_v, row) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(row.url);
                  notify.success('URL copied');
                } catch {
                  notify.error('Could not copy URL');
                }
              }}
            >
              Copy URL
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(row)}>
              Remove
            </Button>
          </div>
        ),
      },
    ],
    [notify]
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
        title="Unable to load media"
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
          <h1 className="font-display text-2xl font-semibold text-charcoal">Media library</h1>
          <p className="mt-1 text-sm text-muted">
            Register image URLs for products and CMS. Binary upload providers remain abstracted (
            {listQuery.data?.provider || 'local'}).
          </p>
        </div>
        <Button
          onClick={() => setEditor({ url: '', altText: '', publicId: '', mimeType: 'image/jpeg' })}
        >
          Add media URL
        </Button>
      </div>

      <div className="mt-4 max-w-sm">
        <Input
          label="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="URL or alt text"
        />
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState
            title="No media yet"
            description="Register an external image URL to reuse across the catalog and CMS."
            action={
              <Button
                onClick={() =>
                  setEditor({ url: '', altText: '', publicId: '', mimeType: 'image/jpeg' })
                }
              >
                Add media URL
              </Button>
            }
          />
        ) : (
          <Table columns={columns} rows={items} getRowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title="Register media URL"
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
              label="URL"
              value={editor.url}
              onChange={(e) => setEditor({ ...editor, url: e.target.value })}
              required
            />
            <Input
              label="Alt text"
              value={editor.altText}
              onChange={(e) => setEditor({ ...editor, altText: e.target.value })}
            />
            <Input
              label="Public ID"
              value={editor.publicId}
              onChange={(e) => setEditor({ ...editor, publicId: e.target.value })}
            />
            <Input
              label="MIME type"
              value={editor.mimeType}
              onChange={(e) => setEditor({ ...editor, mimeType: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove media?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      >
        <p className="text-sm text-muted">
          Soft-deletes the catalog entry. The remote file is not deleted.
        </p>
      </ConfirmationDialog>
    </div>
  );
}
