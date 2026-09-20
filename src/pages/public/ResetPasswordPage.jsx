import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { AuthPageLayout } from '@/components/layout/MarketplacePageChrome';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Reset token is missing. Request a new password reset link.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to reset password'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <Link to="/login" className="font-medium text-shield-red hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {!token ? (
          <Alert tone="warning">
            Missing reset token.{' '}
            <Link to="/forgot-password" className="underline">
              Request a new link
            </Link>
            .
          </Alert>
        ) : null}

        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="At least 8 characters"
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        <Button type="submit" fullWidth loading={submitting} disabled={!token}>
          Update password
        </Button>
      </form>
    </AuthPageLayout>
  );
}
