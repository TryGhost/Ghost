import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DAY_MS, browseConfigWithDunning, dunningWindow } from '@test-utils/fixtures/dunning';

import { dismissLock, markPayNowReturnRoute, useDunningState } from './use-dunning-state';

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

const NOW = new Date('2026-09-10T12:00:00Z');

describe('useDunningState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    window.sessionStorage.clear();
    mockUseSubscriptionStatus.mockReturnValue(null);
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns null without a dunning block', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(undefined));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test('returns null while the dunningWarnings flag is off', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2), {}));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test('returns null when the block is inactive', () => {
    mockUseBrowseConfig.mockReturnValue(
      browseConfigWithDunning({ ...dunningWindow(2), active: false }),
    );

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test.each([
    ['unparseable dates', { active: true, paymentFailedAt: 'nope', suspendsAt: 'also nope' }],
    ['missing dates', { active: true }],
    // A misconfigured host may send a truthy non-boolean; only `true` activates
    ['a non-boolean active value', { ...dunningWindow(2), active: 'false' }],
    [
      'an inverted window',
      {
        active: true,
        paymentFailedAt: NOW.toISOString(),
        suspendsAt: new Date(NOW.getTime() - DAY_MS).toISOString(),
      },
    ],
  ])('returns null for %s', (_label, dunning) => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunning));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toBeNull();
  });

  test('reports the warning phase early in the window', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'warning', urgent: false, daysLeft: 26 });
  });

  test('escalates to urgent styling past a quarter of the window', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(8)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'warning', urgent: true });
  });

  test('stays in the urgent warning phase through the middle of the window', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(14)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'warning', urgent: true, daysLeft: 14 });
  });

  test('locks for the last quarter of the window', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'locked', daysLeft: 6 });
  });

  test('stays locked with zero days left when suspendsAt has passed', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(30)));

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

  test.each([-60, 60])(
    'clears the settled failure with the client clock skewed by %i days',
    (skewDays) => {
      const dunning = dunningWindow(8, { now: NOW.getTime() });
      vi.setSystemTime(new Date(NOW.getTime() + skewDays * DAY_MS));
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunning));
      mockUseSubscriptionStatus.mockReturnValue({ subscription: { status: 'past_due' } });
      // Written by the Ember billing service on the post-payment return.
      window.sessionStorage.setItem('ghost-dunning-payment-settled-for', dunning.paymentFailedAt);

      const { result, rerender } = renderHook(() => useDunningState());
      expect(result.current).toBeNull();

      // A subsequent failure re-arms even when the browser clock is far ahead.
      mockUseBrowseConfig.mockReturnValue(
        browseConfigWithDunning(dunningWindow(2, { now: NOW.getTime() })),
      );
      rerender();
      expect(result.current).not.toBeNull();
    },
  );

  test('does not suppress a different failure even if its timestamp is older', () => {
    window.sessionStorage.setItem(
      'ghost-dunning-payment-settled-for',
      dunningWindow(2).paymentFailedAt,
    );
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'locked' });
  });

  test('ignores the old browser-clock settlement marker', () => {
    window.sessionStorage.setItem(
      'ghost-dunning-payment-settled-at',
      new Date(NOW.getTime() + 60 * DAY_MS).toISOString(),
    );

    const { result } = renderHook(() => useDunningState());

    expect(result.current).toMatchObject({ phase: 'warning' });
  });

  test('records a lock dismissal for the current episode', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

    const { result } = renderHook(() => useDunningState());
    expect(result.current).toMatchObject({ phase: 'locked', lockDismissed: false });

    act(() => {
      dismissLock(result.current!);
    });

    expect(result.current).toMatchObject({ phase: 'locked', lockDismissed: true });
  });

  test('a new payment failure resets the lock dismissal', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

    const { result, rerender } = renderHook(() => useDunningState());
    act(() => {
      dismissLock(result.current!);
    });
    expect(result.current).toMatchObject({ lockDismissed: true });

    // A later episode carries a different paymentFailedAt.
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(23)));
    rerender();

    expect(result.current).toMatchObject({ lockDismissed: false });
  });

  test('ticks the countdown down while dunning is in effect', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));

    const { result } = renderHook(() => useDunningState());
    expect(result.current).toMatchObject({ daysLeft: 26 });

    act(() => {
      vi.advanceTimersByTime(DAY_MS + 60_000);
    });

    expect(result.current).toMatchObject({ daysLeft: 25 });
  });

  test('shares one tick across every consumer of the hook', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2)));

    const first = renderHook(() => useDunningState());
    const second = renderHook(() => useDunningState());
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(DAY_MS + 60_000);
    });

    // Both instances read the same clock, so phase boundaries flip together.
    expect(first.result.current?.daysLeft).toBe(25);
    expect(second.result.current?.daysLeft).toBe(25);

    first.unmount();
    expect(vi.getTimerCount()).toBe(1);
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('installs no periodic tick when there is nothing to derive', () => {
    // The hook mounts in the admin layout on every page: without dunning in
    // effect a tick would re-render every session each minute for nothing.
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(2), {}));

    renderHook(() => useDunningState());

    expect(vi.getTimerCount()).toBe(0);
  });

  describe('when sessionStorage is unavailable', () => {
    beforeEach(() => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('still reports state, with nothing read as settled or dismissed', () => {
      // A window no other test dismisses, so the module-level in-memory
      // fallback from earlier dismissals cannot match this episode.
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(24)));

      const { result } = renderHook(() => useDunningState());

      expect(result.current).toMatchObject({ phase: 'locked', lockDismissed: false });
    });

    test('dismissing the lock still works for the lifetime of the page', () => {
      mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(21)));

      const { result } = renderHook(() => useDunningState());
      act(() => {
        dismissLock(result.current!);
      });

      // The in-memory fallback carries the dismissal.
      expect(result.current).toMatchObject({ phase: 'locked', lockDismissed: true });
    });

    test('recording the Pay now return route swallows the failure', () => {
      // Without storage the post-payment return falls back to the overview.
      expect(() => markPayNowReturnRoute('/analytics')).not.toThrow();
    });
  });

  test('keeps reporting state after a dismissal so the warning banner stays up', () => {
    mockUseBrowseConfig.mockReturnValue(browseConfigWithDunning(dunningWindow(22)));

    const { result } = renderHook(() => useDunningState());
    act(() => {
      dismissLock(result.current!);
    });

    expect(result.current).toMatchObject({ phase: 'locked', urgent: true, lockDismissed: true });
  });
});
