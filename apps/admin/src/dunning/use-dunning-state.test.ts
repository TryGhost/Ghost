import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PAYMENT_GRACE_MS, markPaymentAttempt, useDunningState } from './use-dunning-state';

const { mockUseBrowseConfig, mockUseSubscriptionStatus } = vi.hoisted(() => ({
  mockUseBrowseConfig: vi.fn(),
  mockUseSubscriptionStatus: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: mockUseBrowseConfig,
}));

vi.mock('@/ember-bridge', () => ({
  useSubscriptionStatus: mockUseSubscriptionStatus,
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-10T12:00:00Z');

const withDunning = (dunning?: Record<string, unknown>) => ({
  data: {
    config: {
      hostSettings: {
        billing: { enabled: true, url: 'https://billing.example.com', dunning },
      },
    },
  },
});

// A 28-day window; NOW sits `elapsedDays` in.
const dunningWindow = (elapsedDays: number, windowDays = 28) => ({
  active: true,
  paymentFailedAt: new Date(NOW.getTime() - elapsedDays * DAY_MS).toISOString(),
  suspendsAt: new Date(NOW.getTime() + (windowDays - elapsedDays) * DAY_MS).toISOString(),
});

describe('useDunningState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    window.sessionStorage.clear();
    mockUseSubscriptionStatus.mockReturnValue(null);
    mockUseBrowseConfig.mockReturnValue(withDunning(dunningWindow(2)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns null without a dunning block', () => {
    mockUseBrowseConfig.mockReturnValue(withDunning(undefined));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test('returns null when the block is inactive', () => {
    mockUseBrowseConfig.mockReturnValue(withDunning({ ...dunningWindow(2), active: false }));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test.each([
    ['unparseable dates', { active: true, paymentFailedAt: 'nope', suspendsAt: 'also nope' }],
    ['missing dates', { active: true }],
    [
      'an inverted window',
      {
        active: true,
        paymentFailedAt: NOW.toISOString(),
        suspendsAt: new Date(NOW.getTime() - DAY_MS).toISOString(),
      },
    ],
  ])('returns null for %s', (_label, dunning) => {
    mockUseBrowseConfig.mockReturnValue(withDunning(dunning));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test('reports the warning phase early in the window', () => {
    mockUseBrowseConfig.mockReturnValue(withDunning(dunningWindow(2)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'warning', urgent: false, daysLeft: 26 });
  });

  test('escalates to urgent styling past a quarter of the window', () => {
    mockUseBrowseConfig.mockReturnValue(withDunning(dunningWindow(8)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'warning', urgent: true });
  });

  test('locks for the second half of the window', () => {
    mockUseBrowseConfig.mockReturnValue(withDunning(dunningWindow(14)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'locked', daysLeft: 14 });
  });

  test('stays locked with zero days left when suspendsAt has passed', () => {
    mockUseBrowseConfig.mockReturnValue(withDunning(dunningWindow(30)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'locked', daysLeft: 0 });
  });

  test('clears when the billing app reports an active subscription', () => {
    mockUseSubscriptionStatus.mockReturnValue({ subscription: { status: 'active' } });

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test('does not clear for a subscription that is still past_due', () => {
    mockUseSubscriptionStatus.mockReturnValue({ subscription: { status: 'past_due' } });

    const { result } = renderHook(() => useDunningState());

    expect(result.current).not.toBeNull();
  });

  test('stands down during the payment grace period, then returns', () => {
    markPaymentAttempt();

    const { result } = renderHook(() => useDunningState());
    expect(result.current).toBeNull();

    vi.setSystemTime(new Date(NOW.getTime() + PAYMENT_GRACE_MS + 60_000));
    act(() => {
      vi.advanceTimersByTime(60_000); // fire the hook's minute tick
    });

    expect(result.current).not.toBeNull();
  });
});
