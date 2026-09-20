import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { AuthPageLayout } from '@/components/layout/MarketplacePageChrome';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/errors';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/account';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ identifier, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageLayout
      title="Sign in"
      subtitle="Access your Shield Wolf account."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-shield-red hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Input
          label="Email or phone"
          name="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-shield-red hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthPageLayout>
  );
}
