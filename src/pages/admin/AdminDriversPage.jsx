import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasAnyPermission } from '@/utils/permissions';
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

function emptyDriver() {
  return { id: null, fullName: '', phone: '', status: 'active' };
}

function statusVariant(status) {
  if (status === 'active') return 'success';
  if (status === 'on_delivery') return 'warning';
  return 'neutral';
}

/**
 * Admin drivers / riders CRUD.
 */
export function AdminDriversPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canManage = hasAnyPermission(user, ['delivery.assign', 'delivery.update']);

  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/drivers');
      return payload.data.drivers;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        status: form.status || 'active',
      };
      if (form.id) return apiClient.patch(`/admin/drivers/${form.id}`, payload);
      return apiClient.post('/admin/drivers', payload);
    },
    onSuccess: () => {
      notify.success(editor?.id ? 'Driver updated' : 'Driver created');
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/drivers/${id}`),
    onSuccess: () => {
      notify.success('Driver removed');
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  if (driversQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (driversQuery.isError) {
    return (
      <ErrorState
        title="Unable to load drivers"
        description={driversQuery.error.message}
        onRetry={() => driversQuery.refetch()}
      />
    );
  }

  const drivers = driversQuery.data || [];

  const columns = [
    { key: 'fullName', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <Badge variant={statusVariant(value)}>{String(value || '').replaceAll('_', ' ')}</Badge>
      ),
    },
    { key: 'activeDeliveries', header: 'Active' },
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
                  fullName: row.fullName,
                  phone: row.phone,
                  status: row.status,
                })
              }
            >
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(row)}>
              Remove
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
          <h1 className="font-display text-2xl font-semibold text-charcoal">Drivers / riders</h1>
          <p className="mt-1 text-sm text-muted">Assignable delivery staff for dispatch.</p>
        </div>
        {canManage ? <Button onClick={() => setEditor(emptyDriver())}>Add driver</Button> : null}
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface">
        {drivers.length === 0 ? (
          <EmptyState
            title="No drivers"
            description="Add a driver to start assigning deliveries."
            action={
              canManage ? (
                <Button onClick={() => setEditor(emptyDriver())}>Add driver</Button>
              ) : null
            }
          />
        ) : (
          <Table columns={columns} rows={drivers} getRowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.id ? 'Edit driver' : 'New driver'}
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
              label="Full name"
              required
              value={editor.fullName}
              onChange={(e) => setEditor({ ...editor, fullName: e.target.value })}
            />
            <Input
              label="Phone"
              required
              value={editor.phone}
              onChange={(e) => setEditor({ ...editor, phone: e.target.value })}
            />
            <Select
              label="Status"
              value={editor.status}
              onChange={(e) => setEditor({ ...editor, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_delivery', label: 'On delivery' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmationDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove driver?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      >
        <p className="text-sm text-muted">
          {confirmDelete
            ? `${confirmDelete.fullName} will be deactivated and hidden from assignment lists.`
            : ''}
        </p>
      </ConfirmationDialog>
    </div>
  );
}
