import { useState } from 'react';
import { Alert } from '@/components/common/Alert';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/forms/Input';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

export function CustomerSecurityPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/account/security/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Password updated.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to change password'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-charcoal">Security</h1>
      <p className="mt-1 text-sm text-muted">Change your account password.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {success ? <Alert tone="success">{success}</Alert> : null}
        <Input
          label="Current password"
          type="password"
          required
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={updateField('currentPassword')}
        />
        <Input
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          value={form.newPassword}
          onChange={updateField('newPassword')}
          hint="At least 8 characters"
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={updateField('confirmPassword')}
        />
        <Button type="submit" variant="accent" loading={saving}>
          Update password
        </Button>
      </form>
    </div>
  );
}
