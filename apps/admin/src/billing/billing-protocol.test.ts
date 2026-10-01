import { afterEach, describe, expect, it } from 'vitest';
import { DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY } from '@tryghost/admin-x-framework/api/dunning';
import {
  adminDestinationRoute,
  billingAdminPath,
  billingAlerts,
  billingSubRoute,
  isBillingAppRoute,
  isBillingPath,
  takePayNowReturnRoute,
} from './billing-protocol';

describe('billing routes', () => {
  it('matches only the billing route and its children', () => {
    expect(isBillingPath('/pro')).toBe(true);
    expect(isBillingPath('/pro/domain')).toBe(true);
    expect(isBillingPath('/products')).toBe(false);
  });

  it('maps between Admin paths and billing app routes', () => {
    expect(billingSubRoute('/pro')).toBeNull();
    expect(billingSubRoute('/pro/')).toBeNull();
    expect(billingSubRoute('/pro/domain/')).toBe('/domain');
    expect(billingAdminPath('/')).toBe('/pro');
    expect(billingAdminPath('/update-card')).toBe('/pro/update-card');
  });

  it('accepts paths from the billing app, never URLs', () => {
    expect(isBillingAppRoute('/plans')).toBe(true);
    expect(isBillingAppRoute('//evil.example.com')).toBe(false);
    expect(isBillingAppRoute('https://evil.example.com')).toBe(false);
    expect(isBillingAppRoute(undefined)).toBe(false);
  });
});

describe('adminDestinationRoute', () => {
  it('resolves approved destinations', () => {
    expect(adminDestinationRoute('staff', { automations: false })).toBe('/settings/staff');
    expect(adminDestinationRoute('newsletters', { automations: false })).toBe(
      '/settings/newsletters',
    );
    expect(adminDestinationRoute('newsletters', { automations: true })).toBe('/settings/emails');
  });

  it('ignores anything else', () => {
    for (const destination of ['__proto__', 'constructor', '/settings/staff', 42, null]) {
      expect(adminDestinationRoute(destination, { automations: false })).toBeNull();
    }
  });
});

describe('takePayNowReturnRoute', () => {
  afterEach(() => window.sessionStorage.clear());

  it('consumes the recorded route once', () => {
    window.sessionStorage.setItem(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY, '/posts');

    expect(takePayNowReturnRoute()).toBe('/posts');
    expect(takePayNowReturnRoute()).toBeNull();
  });

  it('rejects anything but an absolute Admin path', () => {
    window.sessionStorage.setItem(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY, '//evil.example.com');

    expect(takePayNowReturnRoute()).toBeNull();
  });
});

describe('billingAlerts', () => {
  const pastDue = { subscription: { status: 'past_due', isActiveTrial: false, trial_end: null } };

  it('flags an overdue subscription unless the dunning warnings replace it', () => {
    expect(billingAlerts(pastDue, { dunningWarningsActive: false }).overdue).toBe(true);
    expect(billingAlerts(pastDue, { dunningWarningsActive: true }).overdue).toBe(false);
  });

  it('flags an exceeded member limit that has a checkout route', () => {
    const exceeded = { exceededLimits: ['members'], checkoutRoute: '/plans' };

    expect(billingAlerts(exceeded, { dunningWarningsActive: false }).exceeded).toBe(true);
    expect(
      billingAlerts({ ...exceeded, checkoutRoute: undefined }, { dunningWarningsActive: false })
        .exceeded,
    ).toBe(false);
    expect(
      billingAlerts({ exceededLimits: 'members' }, { dunningWarningsActive: false }).exceeded,
    ).toBe(false);
  });
});
