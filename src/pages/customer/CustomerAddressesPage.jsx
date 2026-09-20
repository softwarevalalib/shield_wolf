import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Checkbox } from '@/components/forms/Checkbox';
import { Skeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

const emptyForm = {
  label: 'Home',
  firstName: '',
  lastName: '',
  phone: '',
  county: 'Montserrado',
  city: 'Monrovia',
  community: '',
  streetLandmark: '',
  deliveryInstructions: '',
  isDefault: true,
};

export function CustomerAddressesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addressesQuery = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: async () => {
      const payload = await apiClient.get('/account/addresses');
      return payload.data?.addresses || [];
    },
  });

  function updateField(field) {
    return (event) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  function startEdit(address) {
    setEditingId(address.id);
    setForm({
      label: address.label || 'Home',
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      phone: address.phone || '',
      county: address.county || '',
      city: address.city || '',
      community: address.community || '',
      streetLandmark: address.streetLandmark || '',
      deliveryInstructions: address.deliveryInstructions || '',
      isDefault: Boolean(address.isDefault),
    });
    setError('');
    setSuccess('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.patch(`/account/addresses/${editingId}`, form);
        setSuccess('Address updated.');
      } else {
        await apiClient.post('/account/addresses', form);
        setSuccess('Address saved.');
      }
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      await queryClient.invalidateQueries({ queryKey: ['account', 'overview'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save address'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this address?')) return;
    setError('');
    try {
      await apiClient.delete(`/account/addresses/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      await queryClient.invalidateQueries({ queryKey: ['account', 'overview'] });
      if (editingId === id) resetForm();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete address'));
    }
  }

  if (addressesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (addressesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load addresses"
        description="Check your connection and try again."
        onRetry={() => addressesQuery.refetch()}
      />
    );
  }

  const addresses = addressesQuery.data || [];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-charcoal">Addresses</h1>
      <p className="mt-1 text-sm text-muted">Save delivery locations for faster checkout.</p>

      <ul className="mt-6 space-y-3">
        {addresses.length === 0 ? (
          <EmptyState
            title="No saved addresses"
            description="Add a delivery address to use on future orders."
          />
        ) : (
          addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-surface p-4 text-sm"
            >
              <div>
                <p className="font-medium text-charcoal">
                  {address.label || 'Address'}
                  {address.isDefault ? (
                    <span className="ml-2 text-xs font-normal text-muted">(default)</span>
                  ) : null}
                </p>
                <p className="mt-1 text-muted">
                  {[address.streetLandmark, address.community, address.city, address.county]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {address.phone ? <p className="text-muted">{address.phone}</p> : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm underline hover:text-charcoal"
                  onClick={() => startEdit(address)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm text-danger underline"
                  onClick={() => handleDelete(address.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 border-t border-border pt-6">
        <h2 className="font-display text-lg font-semibold text-charcoal">
          {editingId ? 'Edit address' : 'Add address'}
        </h2>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}
        <Input label="Label" value={form.label} onChange={updateField('label')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" value={form.firstName} onChange={updateField('firstName')} />
          <Input label="Last name" value={form.lastName} onChange={updateField('lastName')} />
        </div>
        <Input label="Phone" type="tel" value={form.phone} onChange={updateField('phone')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="County" required value={form.county} onChange={updateField('county')} />
          <Input label="City" required value={form.city} onChange={updateField('city')} />
        </div>
        <Input
          label="Community"
          required
          value={form.community}
          onChange={updateField('community')}
        />
        <Input
          label="Street / landmark"
          required
          value={form.streetLandmark}
          onChange={updateField('streetLandmark')}
        />
        <Textarea
          label="Delivery instructions"
          value={form.deliveryInstructions}
          onChange={updateField('deliveryInstructions')}
          rows={2}
        />
        <Checkbox
          label="Set as default address"
          checked={form.isDefault}
          onChange={updateField('isDefault')}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="accent" loading={saving}>
            {editingId ? 'Update address' : 'Save address'}
          </Button>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
