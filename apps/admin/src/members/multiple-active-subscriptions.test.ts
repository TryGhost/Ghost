import {
  MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER,
  buildDismissedMultipleActiveSubscriptionsPreference,
  buildUserWithDismissedMultipleActiveSubscriptionsBanner,
  getMultipleActiveSubscriptionsBannerPreference,
  isMultipleActiveSubscriptionsFilter,
  parseAccessibilityPreferences,
} from './multiple-active-subscriptions';
import { describe, expect, it } from 'vitest';
import type { User } from '@tryghost/admin-x-framework/api/users';

describe('multiple active subscriptions helpers', () => {
  it('matches only the exact raw filter used by the banner', () => {
    expect(isMultipleActiveSubscriptionsFilter(MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER)).toBe(true);
    expect(
      isMultipleActiveSubscriptionsFilter(`${MULTIPLE_ACTIVE_STRIPE_CUSTOMERS_FILTER}+status:paid`),
    ).toBe(false);
    expect(isMultipleActiveSubscriptionsFilter(undefined)).toBe(false);
  });

  it('parses invalid accessibility JSON as empty preferences', () => {
    expect(parseAccessibilityPreferences('{invalid json')).toEqual({});
    expect(getMultipleActiveSubscriptionsBannerPreference('{invalid json')).toEqual({});
  });

  it('ignores invalid dismissal preference values', () => {
    const accessibility = JSON.stringify({
      multipleActiveSubscriptionsBanner: {
        dismissedCount: 'abc',
        dismissedAt: 123,
        customFutureKey: 'preserved',
      },
    });

    expect(getMultipleActiveSubscriptionsBannerPreference(accessibility)).toEqual({
      dismissedCount: undefined,
      dismissedAt: undefined,
      customFutureKey: 'preserved',
    });
  });

  it('preserves unknown accessibility keys when writing dismissal state', () => {
    const accessibility = JSON.stringify({
      nightShift: true,
      onboarding: {
        checklistState: 'started',
      },
      multipleActiveSubscriptionsBanner: {
        dismissedCount: 1,
        customFutureKey: 'preserved',
      },
    });

    expect(
      JSON.parse(
        buildDismissedMultipleActiveSubscriptionsPreference(
          accessibility,
          3,
          '2026-05-28T12:34:56.000Z',
        ),
      ),
    ).toEqual({
      nightShift: true,
      onboarding: {
        checklistState: 'started',
      },
      multipleActiveSubscriptionsBanner: {
        dismissedCount: 3,
        dismissedAt: '2026-05-28T12:34:56.000Z',
        customFutureKey: 'preserved',
      },
    });
  });

  it('dismisses the banner without carrying the rest of the user', () => {
    const user = {
      id: 'user-1',
      name: 'Owner',
      email: 'owner@example.com',
      accessibility: JSON.stringify({ nightShift: 'dark' }),
    } as User;

    const payload = buildUserWithDismissedMultipleActiveSubscriptionsBanner(
      user,
      2,
      '2026-05-28T12:34:56.000Z',
    );

    expect(Object.keys(payload).sort()).toEqual(['accessibility', 'id']);
    expect(JSON.parse(payload.accessibility as string)).toMatchObject({
      nightShift: 'dark',
      multipleActiveSubscriptionsBanner: { dismissedCount: 2 },
    });
  });
});
