import { afterEach, describe, expect, it } from 'vitest';
import {
  DUNNING_PAYMENT_SETTLED_STORAGE_KEY,
  DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY,
} from '@tryghost/admin-x-framework/api/dunning';
import {
  activeDunning,
  adminDestinationRoute,
  billingAdminPath,
  billingAlerts,
  billingSubRoute,
  initialBillingSubRoute,
  isBillingAppRoute,
  isBillingPath,
  parseBillingSubscription,
  readDunningPaymentSettledFor,
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
    expect(initialBillingSubRoute('/tags')).toBeNull();
    expect(initialBillingSubRoute('/pro')).toBe('/');
    expect(initialBillingSubRoute('/pro/plans')).toBe('/plans');
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
    expect(adminDestinationRoute('theme', { automations: false })).toBe(
      '/settings/design/change-theme',
    );
    expect(adminDestinationRoute('analytics', { automations: false })).toBe('/settings/analytics');
    expect(adminDestinationRoute('staff', { automations: false })).toBe('/settings/staff');
    expect(adminDestinationRoute('stripe', { automations: false })).toBe(
      '/settings/stripe-connect',
    );
    expect(adminDestinationRoute('integrations', { automations: false })).toBe(
      '/settings/integrations',
    );
    expect(adminDestinationRoute('newsletters', { automations: false })).toBe(
      '/settings/newsletters',
    );
    expect(adminDestinationRoute('newsletters', { automations: true })).toBe('/settings/emails');
  });

  it.each([false, true])(
    'opens automations directly with the automations flag %s',
    (automations) => {
      expect(adminDestinationRoute('automations', { automations })).toBe('/automations');
    },
  );

  it('ignores anything else', () => {
    for (const destination of [
      'dashboard',
      '__proto__',
      'constructor',
      '/settings/staff',
      42,
      null,
      undefined,
      { destination: 'analytics' },
    ]) {
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
  it('flags exceeded member limits without a checkout route', () => {
    const exceeded = { exceededLimits: ['members'] };

    expect(billingAlerts(exceeded).exceeded).toBe(true);
    expect(billingAlerts({ exceededLimits: [] })).toEqual({ exceeded: false });
    expect(billingAlerts({ exceededLimits: 'members' }).exceeded).toBe(false);
  });
});

describe('activeDunning', () => {
  const dunning = {
    active: true,
    paymentFailedAt: '2026-09-01T00:00:00Z',
    suspendsAt: '2026-09-29T00:00:00Z',
  };
  const unsettled = { subscriptionStatus: 'past_due', paymentSettledFor: null };

  it('returns the parsed block while the failure is outstanding', () => {
    expect(activeDunning(dunning, unsettled)?.paymentFailedAt).toEqual(
      new Date(dunning.paymentFailedAt),
    );
  });

  it('stands down without a usable block', () => {
    expect(activeDunning(undefined, unsettled)).toBeNull();
    expect(activeDunning({ ...dunning, active: false }, unsettled)).toBeNull();
  });

  it('stands down once the billing app reports an active subscription', () => {
    expect(activeDunning(dunning, { ...unsettled, subscriptionStatus: 'active' })).toBeNull();
  });

  it('stands down only for the failure settled this session', () => {
    expect(
      activeDunning(dunning, { ...unsettled, paymentSettledFor: '2026-09-01T00:00:00.000Z' }),
    ).toBeNull();
    expect(
      activeDunning(dunning, { ...unsettled, paymentSettledFor: '2026-08-01T00:00:00.000Z' }),
    ).not.toBeNull();
  });
});

describe('readDunningPaymentSettledFor', () => {
  afterEach(() => window.sessionStorage.clear());

  it('reads the failure settled this session', () => {
    expect(readDunningPaymentSettledFor()).toBeNull();

    window.sessionStorage.setItem(DUNNING_PAYMENT_SETTLED_STORAGE_KEY, 'settled');

    expect(readDunningPaymentSettledFor()).toBe('settled');
  });
});
