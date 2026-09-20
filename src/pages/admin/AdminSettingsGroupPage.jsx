import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { Switch } from '@/components/forms/Switch';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';

const VALID_GROUPS = new Set([
  'business',
  'store',
  'payments',
  'delivery',
  'tax',
  'email',
  'security',
  'integrations',
]);

function listToText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

function textToList(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeForm(group, value = {}) {
  if (group === 'business') {
    return {
      business_name: value.business_name || '',
      logo_url: value.logo_url || '',
      favicon_url: value.favicon_url || '',
      phones: listToText(value.phones),
      emails: listToText(value.emails),
      whatsapp: value.whatsapp || '',
      address_line: value.address?.line || '',
      address_city: value.address?.city || '',
      address_country: value.address?.country || 'Liberia',
      business_hours: value.business_hours || '',
      currency: value.currency || 'LRD',
      social_facebook: value.social_links?.facebook || '',
      social_instagram: value.social_links?.instagram || '',
      invoice_footer: value.invoice_footer || '',
      receipt_footer: value.receipt_footer || '',
    };
  }
  if (group === 'store') {
    return {
      storefront_enabled: value.storefront_enabled !== false,
      allow_guest_checkout: value.allow_guest_checkout !== false,
      show_out_of_stock: value.show_out_of_stock !== false,
      minimum_order_amount:
        value.minimum_order_amount == null ? '' : String(value.minimum_order_amount),
      default_currency: value.default_currency || 'LRD',
    };
  }
  if (group === 'payments') {
    return {
      mtn_momo_enabled: value.mtn_momo_enabled !== false,
      orange_money_enabled: value.orange_money_enabled !== false,
      mtn_momo_number: value.mtn_momo_number || '',
      orange_money_number: value.orange_money_number || '',
      payment_instructions: value.payment_instructions || '',
      auto_verify: Boolean(value.auto_verify),
    };
  }
  if (group === 'delivery') {
    return {
      delivery_enabled: value.delivery_enabled !== false,
      free_delivery_threshold:
        value.free_delivery_threshold == null ? '' : String(value.free_delivery_threshold),
      default_estimated_time: value.default_estimated_time || '',
      delivery_notes: value.delivery_notes || '',
    };
  }
  if (group === 'tax') {
    return {
      tax_enabled: Boolean(value.tax_enabled),
      tax_rate: value.tax_rate == null ? '0' : String(value.tax_rate),
      tax_label: value.tax_label || 'Tax',
      prices_include_tax: Boolean(value.prices_include_tax),
    };
  }
  if (group === 'email') {
    return {
      from_name: value.from_name || '',
      from_email: value.from_email || '',
      order_notifications: value.order_notifications !== false,
      payment_notifications: value.payment_notifications !== false,
    };
  }
  if (group === 'security') {
    return {
      require_strong_passwords: value.require_strong_passwords !== false,
      session_timeout_minutes: String(value.session_timeout_minutes ?? 720),
      admin_ip_allowlist: listToText(value.admin_ip_allowlist),
    };
  }
  return {
    whatsapp_business_link: value.whatsapp_business_link || '',
    google_maps_url: value.google_maps_url || '',
    analytics_id: value.analytics_id || '',
  };
}

function formToPayload(group, form) {
  if (group === 'business') {
    return {
      business_name: form.business_name.trim(),
      logo_url: form.logo_url.trim() || null,
      favicon_url: form.favicon_url.trim() || null,
      phones: textToList(form.phones),
      emails: textToList(form.emails),
      whatsapp: form.whatsapp.trim() || null,
      address: {
        line: form.address_line.trim(),
        city: form.address_city.trim(),
        country: form.address_country.trim() || 'Liberia',
      },
      business_hours: form.business_hours.trim() || null,
      currency: form.currency.trim() || 'LRD',
      social_links: {
        facebook: form.social_facebook.trim() || null,
        instagram: form.social_instagram.trim() || null,
      },
      invoice_footer: form.invoice_footer.trim() || null,
      receipt_footer: form.receipt_footer.trim() || null,
    };
  }
  if (group === 'store') {
    return {
      storefront_enabled: form.storefront_enabled,
      allow_guest_checkout: form.allow_guest_checkout,
      show_out_of_stock: form.show_out_of_stock,
      minimum_order_amount:
        form.minimum_order_amount === '' ? null : Number(form.minimum_order_amount),
      default_currency: form.default_currency.trim() || 'LRD',
    };
  }
  if (group === 'payments') {
    return {
      mtn_momo_enabled: form.mtn_momo_enabled,
      orange_money_enabled: form.orange_money_enabled,
      mtn_momo_number: form.mtn_momo_number.trim() || null,
      orange_money_number: form.orange_money_number.trim() || null,
      payment_instructions: form.payment_instructions.trim() || null,
      auto_verify: form.auto_verify,
    };
  }
  if (group === 'delivery') {
    return {
      delivery_enabled: form.delivery_enabled,
      free_delivery_threshold:
        form.free_delivery_threshold === '' ? null : Number(form.free_delivery_threshold),
      default_estimated_time: form.default_estimated_time.trim() || null,
      delivery_notes: form.delivery_notes.trim() || null,
    };
  }
  if (group === 'tax') {
    return {
      tax_enabled: form.tax_enabled,
      tax_rate: Number(form.tax_rate || 0),
      tax_label: form.tax_label.trim() || 'Tax',
      prices_include_tax: form.prices_include_tax,
    };
  }
  if (group === 'email') {
    return {
      from_name: form.from_name.trim() || null,
      from_email: form.from_email.trim() || null,
      order_notifications: form.order_notifications,
      payment_notifications: form.payment_notifications,
    };
  }
  if (group === 'security') {
    return {
      require_strong_passwords: form.require_strong_passwords,
      session_timeout_minutes: Number(form.session_timeout_minutes || 720),
      admin_ip_allowlist: textToList(form.admin_ip_allowlist),
    };
  }
  return {
    whatsapp_business_link: form.whatsapp_business_link.trim() || null,
    google_maps_url: form.google_maps_url.trim() || null,
    analytics_id: form.analytics_id.trim() || null,
  };
}

/**
 * Admin settings editor for a single configuration group.
 */
export function AdminSettingsGroupPage() {
  const { group: rawGroup } = useParams();
  const group = rawGroup || 'business';
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);

  const valid = VALID_GROUPS.has(group);

  const query = useQuery({
    queryKey: ['admin', 'settings', group],
    enabled: valid,
    queryFn: async () => {
      const payload = await apiClient.get(`/admin/settings?group=${group}`);
      return payload.data;
    },
  });

  useEffect(() => {
    if (query.data?.value) {
      setForm(normalizeForm(group, query.data.value));
    }
  }, [query.data, group]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = formToPayload(group, form);
      return apiClient.patch('/admin/settings', { group, value });
    },
    onSuccess: () => {
      notify.success('Settings saved');
      setConfirmSave(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['storefront', 'public'] });
    },
    onError: (error) => notify.error(error.message || 'Save failed'),
  });

  const title = useMemo(() => query.data?.label || group, [query.data, group]);

  if (!valid) {
    return (
      <div>
        <ErrorState
          title="Unknown settings group"
          description="Choose a settings page from the hub."
        />
        <p className="mt-4 text-center">
          <Link to="/admin/settings" className="text-sm underline">
            Settings hub
          </Link>
        </p>
      </div>
    );
  }

  if (query.isLoading || !form) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Unable to load settings"
        description={query.error?.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin/settings" className="text-sm text-muted hover:text-charcoal">
          ← Settings
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-charcoal">{title}</h1>
        <p className="mt-1 text-sm text-muted">{query.data?.description}</p>
      </div>

      <form
        className="max-w-2xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmSave(true);
        }}
      >
        {group === 'business' && (
          <>
            <Input
              label="Business name"
              value={form.business_name}
              onChange={(e) => setField('business_name', e.target.value)}
              required
            />
            <Input
              label="Logo URL"
              value={form.logo_url}
              onChange={(e) => setField('logo_url', e.target.value)}
            />
            <Input
              label="Favicon URL"
              value={form.favicon_url}
              onChange={(e) => setField('favicon_url', e.target.value)}
            />
            <Input
              label="Phone numbers (comma-separated)"
              value={form.phones}
              onChange={(e) => setField('phones', e.target.value)}
            />
            <Input
              label="WhatsApp"
              value={form.whatsapp}
              onChange={(e) => setField('whatsapp', e.target.value)}
            />
            <Input
              label="Emails (comma-separated)"
              value={form.emails}
              onChange={(e) => setField('emails', e.target.value)}
            />
            <Input
              label="Address line"
              value={form.address_line}
              onChange={(e) => setField('address_line', e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="City"
                value={form.address_city}
                onChange={(e) => setField('address_city', e.target.value)}
              />
              <Input
                label="Country"
                value={form.address_country}
                onChange={(e) => setField('address_country', e.target.value)}
              />
            </div>
            <Input
              label="Business hours"
              value={form.business_hours}
              onChange={(e) => setField('business_hours', e.target.value)}
            />
            <Input
              label="Currency"
              value={form.currency}
              onChange={(e) => setField('currency', e.target.value)}
            />
            <Input
              label="Facebook URL"
              value={form.social_facebook}
              onChange={(e) => setField('social_facebook', e.target.value)}
            />
            <Input
              label="Instagram URL"
              value={form.social_instagram}
              onChange={(e) => setField('social_instagram', e.target.value)}
            />
            <Textarea
              label="Invoice footer"
              value={form.invoice_footer}
              onChange={(e) => setField('invoice_footer', e.target.value)}
              rows={2}
            />
            <Textarea
              label="Receipt footer"
              value={form.receipt_footer}
              onChange={(e) => setField('receipt_footer', e.target.value)}
              rows={2}
            />
          </>
        )}

        {group === 'store' && (
          <>
            <Switch
              label="Storefront enabled"
              checked={form.storefront_enabled}
              onChange={(checked) => setField('storefront_enabled', checked)}
            />
            <Switch
              label="Allow guest checkout"
              checked={form.allow_guest_checkout}
              onChange={(checked) => setField('allow_guest_checkout', checked)}
            />
            <Switch
              label="Show out-of-stock products"
              checked={form.show_out_of_stock}
              onChange={(checked) => setField('show_out_of_stock', checked)}
            />
            <Input
              label="Minimum order amount"
              type="number"
              min="0"
              step="0.01"
              value={form.minimum_order_amount}
              onChange={(e) => setField('minimum_order_amount', e.target.value)}
            />
            <Input
              label="Default currency"
              value={form.default_currency}
              onChange={(e) => setField('default_currency', e.target.value)}
            />
          </>
        )}

        {group === 'payments' && (
          <>
            <Switch
              label="MTN MoMo enabled"
              checked={form.mtn_momo_enabled}
              onChange={(checked) => setField('mtn_momo_enabled', checked)}
            />
            <Input
              label="MTN MoMo number"
              value={form.mtn_momo_number}
              onChange={(e) => setField('mtn_momo_number', e.target.value)}
            />
            <Switch
              label="Orange Money enabled"
              checked={form.orange_money_enabled}
              onChange={(checked) => setField('orange_money_enabled', checked)}
            />
            <Input
              label="Orange Money number"
              value={form.orange_money_number}
              onChange={(e) => setField('orange_money_number', e.target.value)}
            />
            <Textarea
              label="Payment instructions"
              value={form.payment_instructions}
              onChange={(e) => setField('payment_instructions', e.target.value)}
              rows={4}
            />
            <Switch
              label="Auto-verify payments (not recommended)"
              checked={form.auto_verify}
              onChange={(checked) => setField('auto_verify', checked)}
            />
          </>
        )}

        {group === 'delivery' && (
          <>
            <Switch
              label="Delivery enabled"
              checked={form.delivery_enabled}
              onChange={(checked) => setField('delivery_enabled', checked)}
            />
            <Input
              label="Free-delivery threshold (global)"
              type="number"
              min="0"
              step="0.01"
              value={form.free_delivery_threshold}
              onChange={(e) => setField('free_delivery_threshold', e.target.value)}
            />
            <Input
              label="Default estimated time"
              value={form.default_estimated_time}
              onChange={(e) => setField('default_estimated_time', e.target.value)}
            />
            <Textarea
              label="Delivery notes"
              value={form.delivery_notes}
              onChange={(e) => setField('delivery_notes', e.target.value)}
              rows={4}
            />
            <p className="text-sm text-muted">
              Zone fees live in{' '}
              <Link to="/admin/delivery-zones" className="underline">
                Delivery zones
              </Link>
              .
            </p>
          </>
        )}

        {group === 'tax' && (
          <>
            <Switch
              label="Tax enabled"
              checked={form.tax_enabled}
              onChange={(checked) => setField('tax_enabled', checked)}
            />
            <Input
              label="Tax rate (%)"
              type="number"
              min="0"
              step="0.01"
              value={form.tax_rate}
              onChange={(e) => setField('tax_rate', e.target.value)}
            />
            <Input
              label="Tax label"
              value={form.tax_label}
              onChange={(e) => setField('tax_label', e.target.value)}
            />
            <Switch
              label="Prices include tax"
              checked={form.prices_include_tax}
              onChange={(checked) => setField('prices_include_tax', checked)}
            />
          </>
        )}

        {group === 'email' && (
          <>
            <Input
              label="From name"
              value={form.from_name}
              onChange={(e) => setField('from_name', e.target.value)}
            />
            <Input
              label="From email"
              type="email"
              value={form.from_email}
              onChange={(e) => setField('from_email', e.target.value)}
            />
            <Switch
              label="Order notifications"
              checked={form.order_notifications}
              onChange={(checked) => setField('order_notifications', checked)}
            />
            <Switch
              label="Payment notifications"
              checked={form.payment_notifications}
              onChange={(checked) => setField('payment_notifications', checked)}
            />
          </>
        )}

        {group === 'security' && (
          <>
            <Switch
              label="Require strong passwords"
              checked={form.require_strong_passwords}
              onChange={(checked) => setField('require_strong_passwords', checked)}
            />
            <Input
              label="Session timeout (minutes)"
              type="number"
              min="15"
              value={form.session_timeout_minutes}
              onChange={(e) => setField('session_timeout_minutes', e.target.value)}
            />
            <Input
              label="Admin IP allowlist (comma-separated, empty = all)"
              value={form.admin_ip_allowlist}
              onChange={(e) => setField('admin_ip_allowlist', e.target.value)}
            />
          </>
        )}

        {group === 'integrations' && (
          <>
            <Input
              label="WhatsApp business link"
              value={form.whatsapp_business_link}
              onChange={(e) => setField('whatsapp_business_link', e.target.value)}
            />
            <Input
              label="Google Maps URL"
              value={form.google_maps_url}
              onChange={(e) => setField('google_maps_url', e.target.value)}
            />
            <Input
              label="Analytics ID"
              value={form.analytics_id}
              onChange={(e) => setField('analytics_id', e.target.value)}
            />
          </>
        )}

        <Button type="submit" loading={saveMutation.isPending}>
          Save settings
        </Button>
      </form>

      <ConfirmationDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title="Save settings?"
        confirmLabel="Save"
        onConfirm={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
      >
        <p className="text-sm text-muted">
          These changes apply immediately to the storefront and admin documents.
        </p>
      </ConfirmationDialog>
    </div>
  );
}
