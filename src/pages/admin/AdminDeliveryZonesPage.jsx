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
import { Textarea } from '@/components/forms/Textarea';
import { Switch } from '@/components/forms/Switch';

function emptyZone() {
  return {
    id: null,
    name: '',
    county: '',
    communitiesText: '',
    deliveryFee: '0',
    minimumFreeDeliveryAmount: '',
    estimatedTime: '',
    active: true,
  };
}

function formatMoney(amount) {
  if (amount == null) return '—';
  return Number(amount).toLocaleString();
}

/**
 * Admin delivery zones CRUD.
 */
export function AdminDeliveryZonesPage() {
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canManage = hasAnyPermission(user, ['settings.manage', 'delivery.update']);

  const [editor, setEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const zonesQuery = useQuery({
    queryKey: ['admin', 'delivery-zones'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/delivery-zones');
      return payload.data.zones;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form) => {
      const communities = String(form.communitiesText || '')
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: form.name.trim(),
        county: form.county.trim() || null,
        communities,
        deliveryFee: Number(form.deliveryFee),
        minimumFreeDeliveryAmount: form.minimumFreeDeliveryAmount
          ? Number(form.minimumFreeDeliveryAmount)
          : null,
        estimatedTime: form.estimatedTime.trim() || null,
        active: Boolean(form.active),
      };
      if (form.id) return apiClient.patch(`/admin/delivery-zones/${form.id}`, payload);
      return apiClient.post('/admin/delivery-zones', payload);
    },
    onSuccess: () => {
      notify.success(editor?.id ? 'Zone updated' : 'Zone created');
      setEditor(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-zones'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => apiClient.delete(`/admin/delivery-zones/${id}`),
    onSuccess: () => {
      notify.success('Zone removed');
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-zones'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
    },
    onError: (error) => notify.error(error.message || 'Delete failed'),
  });

  if (zonesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (zonesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load zones"
        description={zonesQuery.error.message}
        onRetry={() => zonesQuery.refetch()}
      />
    );
  }

  const zones = zonesQuery.data || [];

  const columns = [
    { key: 'name', header: 'Zone' },
    { key: 'county', header: 'County', render: (v) => v || '—' },
    {
      key: 'communities',
      header: 'Communities',
      render: (value) => (Array.isArray(value) && value.length ? value.join(', ') : '—'),
    },
    {
      key: 'deliveryFee',
      header: 'Fee',
      render: (value) => formatMoney(value),
    },
    {
      key: 'estimatedTime',
      header: 'ETA',
      render: (v) => v || '—',
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
                  county: row.county || '',
                  communitiesText: (row.communities || []).join('\n'),
                  deliveryFee: String(row.deliveryFee ?? 0),
                  minimumFreeDeliveryAmount:
                    row.minimumFreeDeliveryAmount != null
                      ? String(row.minimumFreeDeliveryAmount)
                      : '',
                  estimatedTime: row.estimatedTime || '',
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
          <h1 className="font-display text-2xl font-semibold text-charcoal">Delivery zones</h1>
          <p className="mt-1 text-sm text-muted">
            Fees and coverage used at checkout and dispatch.
          </p>
        </div>
        {canManage ? <Button onClick={() => setEditor(emptyZone())}>Add zone</Button> : null}
      </div>

      <div className="mt-4 rounded-md border border-border bg-surface">
        {zones.length === 0 ? (
          <EmptyState
            title="No zones"
            description="Seeded zones appear after db:seed, or create new ones here."
            action={
              canManage ? <Button onClick={() => setEditor(emptyZone())}>Add zone</Button> : null
            }
          />
        ) : (
          <Table columns={columns} rows={zones} getRowKey={(row) => row.id} />
        )}
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.id ? 'Edit zone' : 'New zone'}
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
              onChange={(e) => setEditor({ ...editor, name: e.target.value })}
            />
            <Input
              label="County"
              value={editor.county}
              onChange={(e) => setEditor({ ...editor, county: e.target.value })}
            />
            <Textarea
              label="Communities"
              hint="One per line or comma-separated"
              rows={3}
              value={editor.communitiesText}
              onChange={(e) => setEditor({ ...editor, communitiesText: e.target.value })}
            />
            <Input
              label="Delivery fee"
              type="number"
              min="0"
              step="1"
              required
              value={editor.deliveryFee}
              onChange={(e) => setEditor({ ...editor, deliveryFee: e.target.value })}
            />
            <Input
              label="Free delivery from"
              type="number"
              min="0"
              step="1"
              hint="Optional order subtotal threshold"
              value={editor.minimumFreeDeliveryAmount}
              onChange={(e) => setEditor({ ...editor, minimumFreeDeliveryAmount: e.target.value })}
            />
            <Input
              label="Estimated time"
              value={editor.estimatedTime}
              onChange={(e) => setEditor({ ...editor, estimatedTime: e.target.value })}
              placeholder="e.g. 1–2 hours"
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
        title="Remove zone?"
        confirmLabel="Remove"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
      >
        <p className="text-sm text-muted">
          {confirmDelete
            ? `${confirmDelete.name} will be deactivated and hidden from checkout.`
            : ''}
        </p>
      </ConfirmationDialog>
    </div>
  );
}
