import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { AuthPageLayout } from '@/components/layout/MarketplacePageChrome';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const result = await apiClient.post('/auth/forgot-password', { email });
      setMessage(
        result.data?.message ||
          'If an account exists for that email, password reset instructions were sent.'
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to request password reset'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Forgot password"
      subtitle="Enter your account email and we will send reset instructions when a matching account exists."
      footer={
        <Link to="/login" className="font-medium text-shield-red hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}

        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button type="submit" fullWidth loading={submitting}>
          Send reset link
        </Button>
      </form>
    </AuthPageLayout>
  );
}
