import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/forms/Input';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

export function CustomerProfilePage() {
  const { user, refreshSession } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    whatsapp: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setForm({
      firstName: user?.customerProfile?.firstName || '',
      lastName: user?.customerProfile?.lastName || '',
      phone: user?.phone || '',
      whatsapp: user?.customerProfile?.whatsapp || '',
    });
  }, [user]);

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await apiClient.patch('/account/profile', form);
      await refreshSession();
      setSuccess('Profile updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-charcoal">Profile</h1>
      <p className="mt-1 text-sm text-muted">Update your contact details used at checkout.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}
        <Input
          label="Email"
          value={user?.email || ''}
          disabled
          hint="Email cannot be changed here"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First name"
            required
            value={form.firstName}
            onChange={updateField('firstName')}
          />
          <Input
            label="Last name"
            required
            value={form.lastName}
            onChange={updateField('lastName')}
          />
        </div>
        <Input label="Phone" type="tel" value={form.phone} onChange={updateField('phone')} />
        <Input
          label="WhatsApp"
          type="tel"
          value={form.whatsapp}
          onChange={updateField('whatsapp')}
        />
        <Button type="submit" variant="accent" loading={saving}>
          Save profile
        </Button>
      </form>
    </div>
  );
}
