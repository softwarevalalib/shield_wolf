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
import { Switch } from '@/components/forms/Switch';

function emptyVehicle() {
  return { id: null, label: '', plateNumber: '', vehicleType: '', active: true };
}

/**
 * Admin vehicles CRUD.
 */
export function AdminVehiclesPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canManage = hasAnyPermission(user, ['delivery.assign', 'delivery.update']);

  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const vehiclesQuery = useQuery({
    queryKey: ['admin', 'vehicles'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/vehicles');
      return payload.data.vehicles;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const payload = {
        label: form.label.trim(),
        plateNumber: form.plateNumber.trim() || null,
        vehicleType: form.vehicleType.trim() || null,
        active: Boolean(form.active),
      };
      if (form.id) return apiClient.patch(`/admin/vehicles/${form.id}`, payload);
      return apiClient.post('/admin/vehicles', payload);
    },
    onSuccess: () => {
      notify.success(editor?.id ? 'Vehicle updated' : 'Vehicle created');
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'vehicles'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/vehicles/${id}`),
    onSuccess: () => {
      notify.success('Vehicle removed');
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'vehicles'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  if (vehiclesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (vehiclesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load vehicles"
        description={vehiclesQuery.error.message}
        onRetry={() => vehiclesQuery.refetch()}
      />
    );
  }

  const vehicles = vehiclesQuery.data || [];

  const columns = [
    { key: 'label', header: 'Label' },
    { key: 'plateNumber', header: 'Plate', render: (v) => v || '—' },
    { key: 'vehicleType', header: 'Type', render: (v) => v || '—' },
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
                  label: row.label,
                  plateNumber: row.plateNumber || '',
                  vehicleType: row.vehicleType || '',
                  active: Boolean(row.active),
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
          <h1 className="font-display text-2xl font-semibold text-charcoal">Vehicles</h1>
          <p className="mt-1 text-sm text-muted">Fleet used for delivery assignments.</p>
        </div>
        {canManage ? <Button onClick={() => setEditor(emptyVehicle())}>Add vehicle</Button> : null}
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface">
        {vehicles.length === 0 ? (
          <EmptyState
            title="No vehicles"
            description="Add a vehicle to attach to deliveries."
            action={
              canManage ? (
                <Button onClick={() => setEditor(emptyVehicle())}>Add vehicle</Button>
              ) : null
            }
          />
        ) : (
          <Table columns={columns} rows={vehicles} getRowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.id ? 'Edit vehicle' : 'New vehicle'}
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
              label="Label"
              required
              value={editor.label}
              onChange={(e) => setEditor({ ...editor, label: e.target.value })}
            />
            <Input
              label="Plate number"
              value={editor.plateNumber}
              onChange={(e) => setEditor({ ...editor, plateNumber: e.target.value })}
            />
            <Input
              label="Vehicle type"
              value={editor.vehicleType}
              onChange={(e) => setEditor({ ...editor, vehicleType: e.target.value })}
              placeholder="e.g. Motorbike, Van"
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
        title="Remove vehicle?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      >
        <p className="text-sm text-muted">
          {confirmDelete ? `${confirmDelete.label} will be deactivated.` : ''}
        </p>
      </ConfirmationDialog>
    </div>
  );
}
