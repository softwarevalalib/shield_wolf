import { describe, expect, it, beforeEach } from 'vitest';
import { rateLimit, resetRateLimitBuckets } from '../../server/middleware/rateLimit.js';
import { isSafeHttpUrl } from '../../server/middleware/securityHeaders.js';
import { userHasPermission, userHasAnyPermission, isStaffUser } from '../../server/utils/rbac.js';
import {
  eventTypeForOrderStatus,
  NOTIFICATION_EVENTS,
} from '../../server/services/notificationService.js';
import { formatStatusLabel } from '../../src/utils/statusLabels.js';
import { hasPermission, hasAnyPermission } from '../../src/utils/permissions.js';

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it('allows requests under the max', () => {
    const first = rateLimit({ key: 'test:a', windowMs: 60_000, max: 2 });
    const second = rateLimit({ key: 'test:a', windowMs: 60_000, max: 2 });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it('blocks when max is exceeded', () => {
    rateLimit({ key: 'test:b', windowMs: 60_000, max: 1 });
    const blocked = rateLimit({ key: 'test:b', windowMs: 60_000, max: 1 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe('isSafeHttpUrl', () => {
  it('accepts http(s) URLs', () => {
    expect(isSafeHttpUrl('https://cdn.example.com/a.jpg')).toBe(true);
    expect(isSafeHttpUrl('http://localhost:3000/x.png')).toBe(true);
  });

  it('rejects dangerous schemes', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,hi')).toBe(false);
    expect(isSafeHttpUrl('not-a-url')).toBe(false);
  });
});

describe('RBAC', () => {
  const financeUser = {
    userType: 'staff',
    roles: ['finance_officer'],
    permissions: ['finance.view', 'reports.view'],
  };
  const deliveryUser = {
    userType: 'staff',
    roles: ['delivery_manager'],
    permissions: ['delivery.view', 'delivery.update'],
  };
  const customer = {
    userType: 'customer',
    roles: [],
    permissions: [],
  };

  it('identifies staff vs customer', () => {
    expect(isStaffUser(financeUser)).toBe(true);
    expect(isStaffUser(customer)).toBe(false);
  });

  it('finance user cannot manage staff', () => {
    expect(userHasPermission(financeUser, 'staff.manage')).toBe(false);
    expect(userHasAnyPermission(financeUser, ['staff.manage', 'roles.manage'])).toBe(false);
  });

  it('delivery manager cannot alter product pricing without grant', () => {
    expect(userHasPermission(deliveryUser, 'products.update')).toBe(false);
    expect(hasPermission(deliveryUser, 'products.update')).toBe(false);
  });

  it('customer never has admin permissions', () => {
    expect(hasAnyPermission(customer, ['orders.view', 'finance.view'])).toBe(false);
  });
});

describe('notification event map', () => {
  it('maps order statuses to events', () => {
    expect(eventTypeForOrderStatus('delivered')).toBe('order.delivered');
    expect(eventTypeForOrderStatus('packed')).toBe('order.packed');
    expect(eventTypeForOrderStatus('unknown')).toBeNull();
  });

  it('defines required business events', () => {
    for (const key of [
      'order.placed',
      'payment.submitted',
      'payment.approved',
      'payment.rejected',
      'order.out_for_delivery',
      'order.delivered',
      'order.cancelled',
    ]) {
      expect(NOTIFICATION_EVENTS[key]).toBeTruthy();
    }
  });
});

describe('StatusBadge labels', () => {
  it('formats status without relying on color alone', () => {
    expect(formatStatusLabel('out_for_delivery')).toMatch(/delivery/i);
    expect(formatStatusLabel('paid')).toMatch(/paid/i);
  });
});

describe('resolveDbDriver', () => {
  it('prefers postgres when DATABASE_URL is set and driver is empty', async () => {
    const { resolveDbDriver } = await import('../../database/connection.js');
    expect(resolveDbDriver({ driver: '', databaseUrl: 'postgresql://x' })).toBe('postgres');
    expect(resolveDbDriver({ driver: 'sqlite', databaseUrl: 'postgresql://x' })).toBe('sqlite');
    expect(resolveDbDriver({ driver: '', databaseUrl: '' })).toBe('sqlite');
    expect(resolveDbDriver({ driver: 'neon', databaseUrl: '' })).toBe('postgres');
  });
});

describe('jsonValue', () => {
  it('stringifies arrays so Postgres JSONB does not receive PG array literals', async () => {
    const { jsonValue } = await import('../../database/dialect.js');
    expect(jsonValue('postgres', ['Gardnersville', 'Paynesville'])).toBe(
      '["Gardnersville","Paynesville"]'
    );
    expect(jsonValue('sqlite', { a: 1 })).toBe('{"a":1}');
  });
});
