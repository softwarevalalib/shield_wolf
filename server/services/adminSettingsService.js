import crypto from 'node:crypto';
import { getDatabase, getDbDriver } from '../../database/connection.js';
import { isPostgres, jsonValue, nowExpression, toDriverSql } from '../../database/dialect.js';
import { HttpError } from '../utils/errors.js';

function uuid() {
  return crypto.randomUUID();
}

function encodeJson(driver, value) {
  // Always stringify — pg treats JS arrays as PG arrays, not JSONB.
  return jsonValue(driver, value);
}

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function deepMerge(base, patch) {
  if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
    return patch === undefined ? base : patch;
  }
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Route group → business_settings key */
export const BUSINESS_SETTING_GROUPS = {
  business: 'general',
  store: 'store',
  payments: 'payments',
  delivery: 'delivery',
  tax: 'tax',
  email: 'email',
  security: 'security',
  integrations: 'integrations',
};

/** Route page → site_settings key */
export const SITE_CONTENT_PAGES = {
  homepage: 'homepage',
  about: 'about',
  faq: 'faq',
  contact: 'contact',
  delivery: 'delivery_page',
  banners: 'banners',
  announcements: 'announcements',
};

export const BUSINESS_DEFAULTS = {
  general: {
    business_name: 'Shield Wolf',
    logo_url: null,
    favicon_url: null,
    phones: [],
    emails: [],
    whatsapp: null,
    address: { line: '', city: '', country: 'Liberia' },
    business_hours: null,
    currency: 'LRD',
    social_links: {},
    invoice_footer: null,
    receipt_footer: null,
    tax_enabled: false,
    tax_rate: 0,
    minimum_order_amount: null,
    free_delivery_threshold: null,
  },
  store: {
    storefront_enabled: true,
    allow_guest_checkout: true,
    minimum_order_amount: null,
    show_out_of_stock: true,
    default_currency: 'LRD',
  },
  payments: {
    mtn_momo_enabled: true,
    orange_money_enabled: true,
    mtn_momo_number: null,
    orange_money_number: null,
    payment_instructions: null,
    auto_verify: false,
  },
  delivery: {
    delivery_enabled: true,
    free_delivery_threshold: null,
    default_estimated_time: null,
    delivery_notes: null,
  },
  tax: {
    tax_enabled: false,
    tax_rate: 0,
    tax_label: 'Tax',
    prices_include_tax: false,
  },
  email: {
    from_name: 'Shield Wolf',
    from_email: null,
    order_notifications: true,
    payment_notifications: true,
  },
  security: {
    require_strong_passwords: true,
    session_timeout_minutes: 720,
    admin_ip_allowlist: [],
  },
  integrations: {
    whatsapp_business_link: null,
    google_maps_url: null,
    analytics_id: null,
  },
};

export const SITE_DEFAULTS = {
  homepage: {
    announcement_message: 'Premium Products • Reliable Service • Delivery Available',
    announcement_active: true,
    hero_headline: null,
    hero_supporting_text: null,
    hero_image_url: null,
  },
  about: {
    title: 'About Shield Wolf',
    intro: null,
    mission: null,
    vision: null,
    body: null,
  },
  faq: {
    title: 'Frequently Asked Questions',
    intro: null,
    items: [],
  },
  contact: {
    title: 'Contact Us',
    intro: null,
    form_note: null,
  },
  delivery_page: {
    title: 'Delivery Information',
    intro: null,
    body: null,
    notes: null,
  },
  banners: {
    items: [],
  },
  announcements: {
    message: 'Premium Products • Reliable Service • Delivery Available',
    active: true,
  },
};

const GROUP_META = {
  business: { label: 'Business Settings', description: 'Name, phones, address, branding' },
  store: { label: 'Store Settings', description: 'Storefront and checkout defaults' },
  payments: { label: 'Payment Settings', description: 'MoMo numbers and instructions' },
  delivery: { label: 'Delivery Settings', description: 'Global delivery rules' },
  tax: { label: 'Tax Settings', description: 'Tax rate and labels' },
  email: { label: 'Email Settings', description: 'Notification sender defaults' },
  security: { label: 'Security', description: 'Session and password policy' },
  integrations: { label: 'Integrations', description: 'External links and analytics' },
};

const PAGE_META = {
  homepage: { label: 'Homepage', description: 'Hero and homepage copy' },
  about: { label: 'About', description: 'Mission, vision, and company story' },
  faq: { label: 'FAQ', description: 'Frequently asked questions' },
  contact: { label: 'Contact', description: 'Contact page copy' },
  delivery: { label: 'Delivery page', description: 'Public delivery information' },
  banners: { label: 'Banners', description: 'Promotional banners' },
  announcements: { label: 'Announcements', description: 'Site-wide announcement bar' },
};

async function writeAudit(
  db,
  driver,
  { actorId, action, resourceType, resourceId, oldValue, newValue }
) {
  await db.query(
    toDriverSql(
      driver,
      `INSERT INTO audit_logs (id, actor_id, action, resource_type, resource_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ),
    [
      uuid(),
      actorId || null,
      action,
      resourceType,
      resourceId,
      encodeJson(driver, oldValue),
      encodeJson(driver, newValue),
    ]
  );
}

async function readRaw(table, key) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const result = await db.query(
    toDriverSql(driver, `SELECT id, key, value, description FROM ${table} WHERE key = ? LIMIT 1`),
    [key]
  );
  return result.rows?.[0] || null;
}

async function upsertSetting(table, key, value, description, actorId) {
  const db = await getDatabase();
  const driver = getDbDriver();
  const existing = await readRaw(table, key);
  const oldValue = existing ? parseJsonField(existing.value) : null;
  const encoded = encodeJson(driver, value);

  if (existing) {
    await db.query(
      toDriverSql(
        driver,
        `UPDATE ${table} SET value = ?, description = ?, updated_at = ${nowExpression(driver)} WHERE key = ?`
      ),
      [encoded, description || existing.description || null, key]
    );
  } else {
    await db.query(
      toDriverSql(driver, `INSERT INTO ${table} (id, key, value, description) VALUES (?, ?, ?, ?)`),
      [uuid(), key, encoded, description || null]
    );
  }

  await writeAudit(db, driver, {
    actorId,
    action: existing ? 'settings.update' : 'settings.create',
    resourceType: table,
    resourceId: key,
    oldValue,
    newValue: value,
  });

  return value;
}

function defaultsFor(table, key) {
  if (table === 'business_settings') return { ...(BUSINESS_DEFAULTS[key] || {}) };
  return { ...(SITE_DEFAULTS[key] || {}) };
}

/**
 * Load a settings blob merged with defaults (creates row if missing).
 */
export async function getSettingsBlob(table, key) {
  const defaults = defaultsFor(table, key);
  const row = await readRaw(table, key);
  if (!row) {
    await upsertSetting(table, key, defaults, `${table}:${key}`, null);
    return { key, value: defaults };
  }
  const stored = parseJsonField(row.value) || {};
  return { key, value: deepMerge(defaults, stored) };
}

export async function listBusinessSettingGroups() {
  const groups = [];
  for (const [group, key] of Object.entries(BUSINESS_SETTING_GROUPS)) {
    const blob = await getSettingsBlob('business_settings', key);
    groups.push({
      group,
      key,
      ...GROUP_META[group],
      value: blob.value,
    });
  }
  return { groups };
}

export async function getBusinessSettingGroup(group) {
  const key = BUSINESS_SETTING_GROUPS[group];
  if (!key) throw new HttpError(404, 'Unknown settings group', { code: 'NOT_FOUND' });
  const blob = await getSettingsBlob('business_settings', key);
  return {
    group,
    key,
    ...GROUP_META[group],
    value: blob.value,
  };
}

export async function updateBusinessSettingGroup(group, patch, { actorId } = {}) {
  const key = BUSINESS_SETTING_GROUPS[group];
  if (!key) throw new HttpError(404, 'Unknown settings group', { code: 'NOT_FOUND' });
  const current = await getSettingsBlob('business_settings', key);
  const next = deepMerge(current.value, patch || {});
  await upsertSetting(
    'business_settings',
    key,
    next,
    GROUP_META[group]?.description || `Business settings: ${group}`,
    actorId
  );

  // Keep cart tax fields on general in sync when tax group is updated.
  if (group === 'tax') {
    const general = await getSettingsBlob('business_settings', 'general');
    const synced = {
      ...general.value,
      tax_enabled: Boolean(next.tax_enabled),
      tax_rate: Number(next.tax_rate || 0),
    };
    await upsertSetting(
      'business_settings',
      'general',
      synced,
      'Core business configuration (admin-editable)',
      actorId
    );
  }

  // Mirror store/delivery thresholds onto general for readers that use general.
  if (group === 'store' || group === 'delivery') {
    const general = await getSettingsBlob('business_settings', 'general');
    const synced = { ...general.value };
    if (group === 'store' && patch?.minimum_order_amount !== undefined) {
      synced.minimum_order_amount = next.minimum_order_amount;
    }
    if (group === 'delivery' && patch?.free_delivery_threshold !== undefined) {
      synced.free_delivery_threshold = next.free_delivery_threshold;
    }
    if (group === 'store' && patch?.default_currency) {
      synced.currency = next.default_currency;
    }
    await upsertSetting(
      'business_settings',
      'general',
      synced,
      'Core business configuration (admin-editable)',
      actorId
    );
  }

  return getBusinessSettingGroup(group);
}

export async function getContentPage(page) {
  const key = SITE_CONTENT_PAGES[page];
  if (!key) throw new HttpError(404, 'Unknown content page', { code: 'NOT_FOUND' });
  const blob = await getSettingsBlob('site_settings', key);
  return {
    page,
    key,
    ...PAGE_META[page],
    value: blob.value,
  };
}

export async function updateContentPage(page, patch, { actorId } = {}) {
  const key = SITE_CONTENT_PAGES[page];
  if (!key) throw new HttpError(404, 'Unknown content page', { code: 'NOT_FOUND' });
  const current = await getSettingsBlob('site_settings', key);
  let next = deepMerge(current.value, patch || {});

  // Announcements page mirrors homepage announcement fields for the public bar.
  if (page === 'announcements') {
    next = {
      message: patch?.message ?? current.value.message,
      active: patch?.active ?? current.value.active,
    };
    const homepage = await getSettingsBlob('site_settings', 'homepage');
    await upsertSetting(
      'site_settings',
      'homepage',
      {
        ...homepage.value,
        announcement_message: next.message,
        announcement_active: Boolean(next.active),
      },
      'Homepage / announcement CMS settings',
      actorId
    );
  }

  if (
    page === 'homepage' &&
    (patch?.announcement_message !== undefined || patch?.announcement_active !== undefined)
  ) {
    const announcements = await getSettingsBlob('site_settings', 'announcements');
    await upsertSetting(
      'site_settings',
      'announcements',
      {
        message: next.announcement_message ?? announcements.value.message,
        active:
          next.announcement_active !== undefined
            ? Boolean(next.announcement_active)
            : announcements.value.active,
      },
      'Site-wide announcement bar',
      actorId
    );
  }

  await upsertSetting(
    'site_settings',
    key,
    next,
    PAGE_META[page]?.description || `CMS: ${page}`,
    actorId
  );
  return getContentPage(page);
}

export async function listContentPages() {
  const pages = [];
  for (const page of Object.keys(SITE_CONTENT_PAGES)) {
    const data = await getContentPage(page);
    pages.push({
      page: data.page,
      key: data.key,
      label: data.label,
      description: data.description,
    });
  }
  return { pages };
}

/**
 * Public CMS page payload (no admin metadata).
 */
export async function getPublicContentPage(page) {
  const data = await getContentPage(page);
  return data.value;
}
