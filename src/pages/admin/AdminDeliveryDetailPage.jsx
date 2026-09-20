import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { hasAnyPermission } from '@/utils/permissions';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';

function labelStatus(status) {
  return String(status || '').replaceAll('_', ' ');
}

function statusVariant(status) {
  if (status === 'delivered') return 'success';
  if (status === 'failed' || status === 'cancelled' || status === 'returned') return 'danger';
  if (status === 'out_for_delivery' || status === 'attempted' || status === 'assigned') {
    return 'warning';
  }
  return 'neutral';
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Admin delivery detail — assign driver/vehicle, advance status, history.
 */
export function AdminDeliveryDetailPage() {
  const { deliveryId } = useParams();
  const { user } = useAuth();
  const notify = useNotification();
  const queryClient = useQueryClient();
  const canUpdate = hasAnyPermission(user, ['delivery.update', 'delivery.assign']);

  const [form, setForm] = useState({
    status: '',
    driverId: '',
    vehicleId: '',
    deliveryZoneId: '',
    expectedAt: '',
    adminNotes: '',
    driverNotes: '',
    failureReason: '',
    proofOfDeliveryUrl: '',
    note: '',
  });

  const detailQuery = useQuery({
    queryKey: ['admin', 'delivery', deliveryId],
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/deliveries/${deliveryId}`);
      return payload.data;
    },
  });

  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/drivers');
      return payload.data.drivers;
    },
  });

  const vehiclesQuery = useQuery({
    queryKey: ['admin', 'vehicles'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/vehicles');
      return payload.data.vehicles;
    },
  });

  const zonesQuery = useQuery({
    queryKey: ['admin', 'delivery-zones'],
    queryFn: async () => {
      const payload = await apiClient.get('/admin/delivery-zones');
      return payload.data.zones;
    },
  });

  useEffect(() => {
    const delivery = detailQuery.data?.delivery;
    if (!delivery) return;
    setForm({
      status: delivery.status,
      driverId: delivery.driverId || '',
      vehicleId: delivery.vehicleId || '',
      deliveryZoneId: delivery.deliveryZoneId || '',
      expectedAt: toLocalInput(delivery.expectedAt),
      adminNotes: delivery.adminNotes || '',
      driverNotes: delivery.driverNotes || '',
      failureReason: delivery.failureReason || '',
      proofOfDeliveryUrl: delivery.proofOfDeliveryUrl || '',
      note: '',
    });
  }, [detailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (body) => apiClient.patch(`/admin/deliveries/${deliveryId}`, body),
    onSuccess: () => {
      notify.success('Delivery updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery', deliveryId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (error) => notify.error(error.message || 'Update failed'),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Unable to load delivery"
        description={detailQuery.error.message}
        onRetry={() => detailQuery.refetch()}
      />
    );
  }

  const { delivery, statusHistory } = detailQuery.data;
  const allowed = delivery.allowedTransitions || [];

  function updateField(key) {
    return (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  function handleSave(e) {
    e.preventDefault();
    const body = {
      driverId: form.driverId || null,
      vehicleId: form.vehicleId || null,
      deliveryZoneId: form.deliveryZoneId || null,
      expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : null,
      adminNotes: form.adminNotes || null,
      driverNotes: form.driverNotes || null,
      failureReason: form.failureReason || null,
      proofOfDeliveryUrl: form.proofOfDeliveryUrl || null,
      note: form.note || null,
    };
    if (form.status && form.status !== delivery.status) {
      body.status = form.status;
    }
    saveMutation.mutate(body);
  }

  const statusOptions = [
    { value: delivery.status, label: `${labelStatus(delivery.status)} (current)` },
    ...allowed.map((s) => ({ value: s, label: labelStatus(s) })),
  ];

  const driverOptions = [
    { value: '', label: 'Unassigned' },
    ...(driversQuery.data || [])
      .filter((d) => d.status !== 'inactive' || d.id === delivery.driverId)
      .map((d) => ({
        value: d.id,
        label: `${d.fullName} · ${d.phone}${d.status === 'on_delivery' ? ' (on delivery)' : ''}`,
      })),
  ];

  const vehicleOptions = [
    { value: '', label: 'No vehicle' },
    ...(vehiclesQuery.data || [])
      .filter((v) => v.active || v.id === delivery.vehicleId)
      .map((v) => ({
        value: v.id,
        label: `${v.label}${v.plateNumber ? ` · ${v.plateNumber}` : ''}`,
      })),
  ];

  const zoneOptions = [
    { value: '', label: 'No zone' },
    ...(zonesQuery.data || []).map((z) => ({
      value: z.id,
      label: z.name,
    })),
  ];

  return (
    <div>
      <p className="text-sm text-muted">
        <Link to="/admin/deliveries" className="hover:underline">
          Delivery
        </Link>
        <span aria-hidden="true"> / </span>
        <Link to="/admin/deliveries/all" className="hover:underline">
          All
        </Link>
        <span aria-hidden="true"> / </span>
        {delivery.deliveryNumber}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {delivery.deliveryNumber}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Order{' '}
            <Link to={`/admin/orders/${delivery.orderId}`} className="font-medium hover:underline">
              {delivery.orderNumber}
            </Link>
            {delivery.orderStatus ? ` · ${labelStatus(delivery.orderStatus)}` : ''}
          </p>
        </div>
        <Badge variant={statusVariant(delivery.status)}>{labelStatus(delivery.status)}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Destination</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted">Customer</dt>
                <dd className="font-medium">{delivery.customerName}</dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd>{delivery.customerPhone || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Address</dt>
                <dd>
                  {[delivery.streetLandmark, delivery.community, delivery.city, delivery.county]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Zone</dt>
                <dd>{delivery.zoneName || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Fee</dt>
                <dd>{delivery.deliveryFee != null ? delivery.deliveryFee : '—'}</dd>
              </div>
              {delivery.deliveryInstructions ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Instructions</dt>
                  <dd>{delivery.deliveryInstructions}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="font-display text-lg font-semibold text-charcoal">Status history</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {(statusHistory || []).length === 0 ? (
                <li className="text-muted">No transitions yet.</li>
              ) : (
                statusHistory.map((entry) => (
                  <li key={entry.id} className="border-b border-border pb-2 last:border-0">
                    <p className="font-medium">
                      {entry.fromStatus ? `${labelStatus(entry.fromStatus)} → ` : ''}
                      {labelStatus(entry.toStatus)}
                    </p>
                    <p className="text-xs text-muted">
                      {entry.at ? new Date(entry.at).toLocaleString() : ''}
                      {entry.changedByEmail ? ` · ${entry.changedByEmail}` : ''}
                    </p>
                    {entry.note ? <p className="mt-1 text-muted">{entry.note}</p> : null}
                  </li>
                ))
              )}
            </ol>
          </section>
        </div>

        <div>
          <form
            onSubmit={handleSave}
            className="space-y-3 rounded-md border border-border bg-surface p-4"
          >
            <h2 className="font-display text-lg font-semibold text-charcoal">Update</h2>
            {!canUpdate ? (
              <p className="text-sm text-muted">You do not have permission to update deliveries.</p>
            ) : (
              <>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={updateField('status')}
                  options={statusOptions}
                />
                <Select
                  label="Driver"
                  value={form.driverId}
                  onChange={updateField('driverId')}
                  options={driverOptions}
                />
                <Select
                  label="Vehicle"
                  value={form.vehicleId}
                  onChange={updateField('vehicleId')}
                  options={vehicleOptions}
                />
                <Select
                  label="Zone"
                  value={form.deliveryZoneId}
                  onChange={updateField('deliveryZoneId')}
                  options={zoneOptions}
                />
                <Input
                  label="Expected at"
                  type="datetime-local"
                  value={form.expectedAt}
                  onChange={updateField('expectedAt')}
                />
                <Textarea
                  label="Admin notes"
                  value={form.adminNotes}
                  onChange={updateField('adminNotes')}
                  rows={2}
                />
                <Textarea
                  label="Driver notes"
                  value={form.driverNotes}
                  onChange={updateField('driverNotes')}
                  rows={2}
                />
                {form.status === 'failed' || delivery.status === 'failed' ? (
                  <Textarea
                    label="Failure reason"
                    value={form.failureReason}
                    onChange={updateField('failureReason')}
                    rows={2}
                    required={form.status === 'failed'}
                  />
                ) : null}
                <Input
                  label="Proof of delivery URL"
                  value={form.proofOfDeliveryUrl}
                  onChange={updateField('proofOfDeliveryUrl')}
                  placeholder="https://…"
                />
                <Textarea
                  label="Transition note"
                  value={form.note}
                  onChange={updateField('note')}
                  rows={2}
                  hint="Optional note recorded in status history"
                />
                <Button type="submit" loading={saveMutation.isPending} fullWidth>
                  Save changes
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
