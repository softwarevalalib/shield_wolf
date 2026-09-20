import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/common/Alert';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { Textarea } from '@/components/forms/Textarea';
import { apiClient } from '@/services/apiClient';
import { getErrorMessage } from '@/utils/errors';

function formatMoney(amount, currency = 'LRD') {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

function statusVariant(status) {
  if (status === 'paid') return 'success';
  if (status === 'rejected' || status === 'failed') return 'danger';
  if (status === 'pending_verification') return 'warning';
  return 'info';
}

/**
 * Manual Mobile Money payment submission form.
 * Never asks for PIN/OTP.
 */
export function PaymentSubmitForm({
  orderNumber: initialOrderNumber = '',
  phone: initialPhone = '',
  requirePhone = true,
  lockedOrder = false,
  onSuccess,
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [method, setMethod] = useState('mtn_momo');
  const [reference, setReference] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const configQuery = useQuery({
    queryKey: ['payments', 'methods'],
    queryFn: async () => {
      const payload = await apiClient.get('/payments/methods');
      return payload.data;
    },
  });

  useEffect(() => {
    setOrderNumber(initialOrderNumber || '');
  }, [initialOrderNumber]);

  useEffect(() => {
    setPhone(initialPhone || '');
  }, [initialPhone]);

  const instructions = configQuery.data?.instructions?.[method];
  const evidenceEnabled = configQuery.data?.evidenceEnabled !== false;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    setResult(null);

    try {
      const payload = await apiClient.post('/payments/submit', {
        orderNumber: orderNumber.trim(),
        phone: requirePhone ? phone.trim() : phone.trim() || undefined,
        method,
        reference: reference.trim(),
        customerNote: customerNote.trim(),
        evidenceUrl: evidenceUrl.trim(),
      });
      const data = payload.data;
      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit payment details'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {result?.payment ? (
        <Alert tone="success" title="Payment details submitted">
          Status: <span className="capitalize">{result.payment.status.replaceAll('_', ' ')}</span>.
          An administrator will verify before fulfillment.
        </Alert>
      ) : null}

      {!lockedOrder ? (
        <Input
          label="Order number"
          required
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="SW-2026-000001"
          autoComplete="off"
        />
      ) : null}

      {requirePhone ? (
        <Input
          label="Phone number"
          type="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          hint="Same phone used at checkout"
          autoComplete="tel"
        />
      ) : null}

      <Select
        label="Mobile Money provider"
        required
        value={method}
        onChange={(event) => setMethod(event.target.value)}
        options={[
          { value: 'mtn_momo', label: 'MTN MoMo' },
          { value: 'orange_money', label: 'Orange Money' },
        ]}
      />

      {instructions ? (
        <div className="rounded-md border border-border bg-off-white px-3 py-3 text-sm text-muted">
          <p className="font-medium text-charcoal">{instructions.label}</p>
          {instructions.number ? (
            <p className="mt-1">
              Send to <span className="font-medium text-charcoal">{instructions.number}</span>
              {instructions.accountName ? ` (${instructions.accountName})` : ''}
            </p>
          ) : (
            <p className="mt-1">
              Use the Shield Wolf MoMo number shared with your order confirmation.
            </p>
          )}
          {result?.order?.total != null ? (
            <p className="mt-1">Amount: {formatMoney(result.order.total, result.order.currency)}</p>
          ) : null}
          <p className="mt-2 text-xs">{instructions.hint}</p>
        </div>
      ) : null}

      <Input
        label="Transaction reference"
        required
        value={reference}
        onChange={(event) => setReference(event.target.value)}
        hint="From your MoMo confirmation SMS or app — never your PIN or OTP"
        autoComplete="off"
      />

      <Textarea
        label="Note (optional)"
        value={customerNote}
        onChange={(event) => setCustomerNote(event.target.value)}
        rows={2}
        hint="e.g. name on the MoMo account"
      />

      {evidenceEnabled ? (
        <Input
          label="Evidence URL (optional)"
          type="url"
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          hint="Link to a screenshot hosted online. Do not upload PINs or passwords."
          placeholder="https://"
        />
      ) : null}

      <Button type="submit" variant="accent" loading={submitting}>
        Submit payment details
      </Button>

      {result?.payment ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          Current status
          <Badge variant={statusVariant(result.payment.status)}>
            {result.payment.status.replaceAll('_', ' ')}
          </Badge>
        </p>
      ) : null}
    </form>
  );
}
