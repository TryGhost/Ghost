import { afterEach, describe, expect, it } from 'vitest';
import { DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY } from '@tryghost/admin-x-framework/api/dunning';
import {
  adminDestinationRoute,
  billingAdminPath,
  billingAlerts,
  billingSubRoute,
  initialBillingSubRoute,
  isBillingAppRoute,
  isBillingPath,
  parseBillingSubscription,
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

  it('loads the route Ember would load for each Admin URL', () => {
    expect(initialBillingSubRoute('/tags', '')).toBeNull();
    expect(initialBillingSubRoute('/pro', '')).toBe('/');
    expect(initialBillingSubRoute('/pro', '?interval=year')).toBe('/');
    expect(initialBillingSubRoute('/pro', '?action=checkout')).toBe('?action=checkout');
    expect(initialBillingSubRoute('/pro/plans', '?interval=year')).toBe('/plans');
    expect(initialBillingSubRoute('/pro/plans', '?action=checkout')).toBe('/plans');
  });

  it('accepts paths from the billing app, never URLs', () => {
    expect(isBillingAppRoute('/plans')).toBe(true);
    expect(isBillingAppRoute('//evil.example.com')).toBe(false);
    expect(isBillingAppRoute('https://evil.example.com')).toBe(false);
    expect(isBillingAppRoute(undefined)).toBe(false);
  });

  it('rejects dot segments, which would resolve outside the billing route', () => {
    expect(isBillingAppRoute('/plans?interval=year')).toBe(true);
    for (const route of ['/../settings/staff', '/a/./b', '/a/..', '/%2E%2e/tags', '/a\\b']) {
      expect(isBillingAppRoute(route)).toBe(false);
    }
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

describe('parseBillingSubscription', () => {
  it('keeps a well-formed subscription', () => {
    const subscription = {
      status: 'active',
      isActiveTrial: true,
      trial_end: '2026-11-01T00:00:00Z',
    };

    expect(parseBillingSubscription({ ...subscription, plan: 'creator' })).toEqual(subscription);
  });

  it('needs only a status, so a report shaped differently still counts', () => {
    expect(parseBillingSubscription({ status: 'active' })).toEqual({
      status: 'active',
      isActiveTrial: false,
      trial_end: null,
    });
  });

  it('drops optional fields that would mislead the trial banner', () => {
    expect(
      parseBillingSubscription({ status: 'trialing', isActiveTrial: 'yes', trial_end: 'soon' }),
    ).toEqual({ status: 'trialing', isActiveTrial: false, trial_end: null });
  });

  it('ignores reports without a usable status', () => {
    for (const value of [true, 'active', { status: 1 }, {}, null]) {
      expect(parseBillingSubscription(value)).toBeNull();
    }
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
